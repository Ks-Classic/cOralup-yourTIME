import { NextRequest, NextResponse } from 'next/server'
import { isMockMode } from '@/lib/supabase'
import { db } from '@/db'
import { visits, children, profiles, questionnaireResponses, questionnaireItems, questionnaireCategories, visitPhotos, diagnosisResponses, diagnosisItems, diagnosisCategories, diagnoses, reports } from '@/db/schema'
import { eq, or, ilike, asc, desc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// モック用データ
const mockVisits = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'questionnaire_completed',
    visit_date: new Date().toISOString(),
    child_age_months: 48,
    children: {
      id: 'child-1',
      first_name: '花子',
      last_name: '山田',
      birthday: '2020-03-15',
      gender: 'female',
    },
    profiles: {
      id: 'parent-1',
      display_name: '山田 太郎',
      line_user_id: 'U1234567890',
    },
    medical_interviews: {
      chief_complaint: '歯並びが気になる',
      concerns: ['指しゃぶり', '口呼吸'],
      answers: {
        brushing_frequency: '2回/日',
        snack_frequency: '2回/日',
      },
    },
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    status: 'questionnaire_completed',
    visit_date: new Date().toISOString(),
    child_age_months: 72,
    children: {
      id: 'child-2',
      first_name: '次郎',
      last_name: '鈴木',
      birthday: '2018-07-20',
      gender: 'male',
    },
    profiles: {
      id: 'parent-2',
      display_name: '鈴木 花子',
      line_user_id: 'U0987654321',
    },
    medical_interviews: {
      chief_complaint: '虫歯が心配',
      concerns: ['甘いもの好き'],
      answers: {
        brushing_frequency: '1回/日',
        snack_frequency: '3回/日',
      },
    },
  },
]

// GET: visit_idまたは受付番号でセッション検索
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const visitId = searchParams.get('visitId')
    const code = searchParams.get('code')

    // モックモードの場合
    if (isMockMode) {
      if (visitId) {
        const visit = mockVisits.find(v => v.id === visitId)
        if (visit) {
          return NextResponse.json({ success: true, visit })
        }
        return NextResponse.json(
          { success: false, error: 'not_found', message: '該当するセッションが見つかりません' },
          { status: 404 }
        )
      }

      if (code) {
        const matchedVisits = mockVisits.filter(v =>
          v.id.toUpperCase().startsWith(code.toUpperCase())
        )
        return NextResponse.json({ success: true, visits: matchedVisits })
      }

      return NextResponse.json(
        { success: false, error: 'invalid_params', message: 'visitIdまたはcodeを指定してください' },
        { status: 400 }
      )
    }

    // Drizzleで取得
    if (visitId) {
      // visit_idで検索 - visitとchildを取得
      const visitRows = await db
        .select({
          id: visits.id,
          status: visits.status,
          visitDate: visits.visitDate,
          childAgeMonths: visits.childAgeMonths,
          sessionId: visits.sessionId,
          childId: visits.childId,
        })
        .from(visits)
        .where(eq(visits.id, visitId))
        .limit(1)

      if (visitRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'not_found', message: '該当するセッションが見つかりません' },
          { status: 404 }
        )
      }

      const visit = visitRows[0]

      // デバッグログ: childIdがnullの場合を確認
      console.log('[Session API] Visit found:', { visitId: visit.id, childId: visit.childId, status: visit.status })

      // childを取得
      let childData = null
      if (visit.childId) {
        const childRows = await db
          .select({
            id: children.id,
            firstName: children.firstName,
            lastName: children.lastName,
            firstNameKana: children.firstNameKana,
            lastNameKana: children.lastNameKana,
            birthday: children.birthday,
            gender: children.gender,
            parentProfileId: children.parentProfileId,
          })
          .from(children)
          .where(eq(children.id, visit.childId))
          .limit(1)
        childData = childRows[0] || null
      }

      // childIdがnullの場合、sessionIdで子供を紐付ける試み
      // （壊れたvisitデータの復旧のため）
      if (!childData && visit.sessionId) {
        console.log('[Session API] Trying to find child by sessionId:', visit.sessionId)

        // 問診回答からvisitIdを取得し、そのvisitに紐づく子供を探す
        // または、同じsessionIdを持つ別のvisitから子供を探す
        const relatedVisitRows = await db
          .select({ childId: visits.childId })
          .from(visits)
          .where(eq(visits.sessionId, visit.sessionId))
          .limit(10)

        const validChildId = relatedVisitRows.find(v => v.childId)?.childId

        if (validChildId) {
          console.log('[Session API] Found child from related visit:', validChildId)
          const childRows = await db
            .select({
              id: children.id,
              firstName: children.firstName,
              lastName: children.lastName,
              firstNameKana: children.firstNameKana,
              lastNameKana: children.lastNameKana,
              birthday: children.birthday,
              gender: children.gender,
              parentProfileId: children.parentProfileId,
            })
            .from(children)
            .where(eq(children.id, validChildId))
            .limit(1)
          childData = childRows[0] || null

          // 壊れたvisitを修復（childIdを更新）
          if (childData) {
            await db
              .update(visits)
              .set({ childId: childData.id, updatedAt: new Date() } as Partial<typeof visits.$inferInsert>)
              .where(eq(visits.id, visit.id))
            console.log('[Session API] Fixed broken visit, set childId:', childData.id)
          }
        }
      }

      // 保護者プロフィールを取得
      let parentProfile = null
      if (childData?.parentProfileId) {
        const profileRows = await db
          .select({
            id: profiles.id,
            displayName: profiles.displayName,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            phoneNumber: profiles.phoneNumber,
            lineUserId: profiles.lineUserId,
            email: profiles.email,
          })
          .from(profiles)
          .where(eq(profiles.id, childData.parentProfileId))
          .limit(1)
        parentProfile = profileRows[0] || null
      }

      // 問診回答を取得
      let questionnaireResponsesList: any[] = []
      const responseRows = await db
        .select({
          id: questionnaireResponses.id,
          itemId: questionnaireResponses.itemId,
          value: questionnaireResponses.value,
          answeredAt: questionnaireResponses.answeredAt,
          itemQuestion: questionnaireItems.question,
          itemAnswerType: questionnaireItems.answerType,
          itemOptions: questionnaireItems.options,
          itemCategoryId: questionnaireItems.categoryId,
          categoryId: questionnaireCategories.id,
          categoryName: questionnaireCategories.name,
          categoryDisplayOrder: questionnaireCategories.displayOrder,
        })
        .from(questionnaireResponses)
        .leftJoin(questionnaireItems, eq(questionnaireResponses.itemId, questionnaireItems.id))
        .leftJoin(questionnaireCategories, eq(questionnaireItems.categoryId, questionnaireCategories.id))
        .where(
          visit.sessionId
            ? or(eq(questionnaireResponses.visitId, visit.id), eq(questionnaireResponses.sessionId, visit.sessionId))
            : eq(questionnaireResponses.visitId, visit.id)
        )
        .orderBy(asc(questionnaireResponses.answeredAt))

      // Supabase形式に変換
      questionnaireResponsesList = responseRows.map(r => ({
        id: r.id,
        item_id: r.itemId,
        value: r.value,
        answered_at: r.answeredAt,
        questionnaire_items: {
          id: r.itemId,
          question: r.itemQuestion,
          answer_type: r.itemAnswerType,
          options: r.itemOptions,
          category_id: r.itemCategoryId,
          questionnaire_categories: {
            id: r.categoryId,
            name: r.categoryName,
            display_order: r.categoryDisplayOrder,
          },
        },
      }))

      // 写真を取得
      const photoRows = await db
        .select({
          id: visitPhotos.id,
          photoType: visitPhotos.photoType,
          publicUrl: visitPhotos.publicUrl,
          metadata: visitPhotos.metadata,
          createdAt: visitPhotos.createdAt,
        })
        .from(visitPhotos)
        .where(eq(visitPhotos.visitId, visit.id))
        .orderBy(desc(visitPhotos.createdAt))

      const photosList = photoRows.map(p => ({
        id: p.id,
        type: p.photoType,
        url: p.publicUrl,
        uploaded_at: p.createdAt?.toISOString(),
      }))

      // 紙問診票から抽出した問診データを取得
      let paperQuestionnaireData = null
      const paperPhoto = photoRows.find(p => p.photoType === 'paper_questionnaire' && p.metadata)
      if (paperPhoto?.metadata) {
        const meta = paperPhoto.metadata as any
        if (meta.questionnaire_data) {
          paperQuestionnaireData = meta.questionnaire_data
        }
      }

      // 診断回答を取得
      let diagnosisResponsesList: any[] = []
      const diagnosisRows = await db
        .select({
          id: diagnosisResponses.id,
          itemId: diagnosisResponses.itemId,
          value: diagnosisResponses.value,
          metadata: diagnosisResponses.metadata,
          answeredAt: diagnosisResponses.answeredAt,
          itemQuestion: diagnosisItems.question,
          itemAnswerType: diagnosisItems.answerType,
          itemOptions: diagnosisItems.options,
          itemCategoryId: diagnosisItems.categoryId,
          categoryId: diagnosisCategories.id,
          categoryName: diagnosisCategories.name,
          categoryDisplayOrder: diagnosisCategories.displayOrder,
        })
        .from(diagnosisResponses)
        .leftJoin(diagnosisItems, eq(diagnosisResponses.itemId, diagnosisItems.id))
        .leftJoin(diagnosisCategories, eq(diagnosisItems.categoryId, diagnosisCategories.id))
        .where(
          visit.sessionId
            ? or(eq(diagnosisResponses.visitId, visit.id), eq(diagnosisResponses.sessionId, visit.sessionId))
            : eq(diagnosisResponses.visitId, visit.id)
        )
        .orderBy(asc(diagnosisResponses.answeredAt))

      diagnosisResponsesList = diagnosisRows.map(r => ({
        id: r.id,
        item_id: r.itemId,
        value: r.value,
        metadata: r.metadata,
        answered_at: r.answeredAt,
        diagnosis_items: {
          id: r.itemId,
          question: r.itemQuestion,
          answer_type: r.itemAnswerType,
          options: r.itemOptions,
          category_id: r.itemCategoryId,
          diagnosis_categories: {
            id: r.categoryId,
            name: r.categoryName,
            display_order: r.categoryDisplayOrder,
          },
        },
      }))

      // フォールバック: diagnosis_responsesにデータがない場合、
      // diagnoses.diagnosisItems (JSONBカラム) からデータを復元
      if (diagnosisResponsesList.length === 0) {
        const diagnosisLegacyRows = await db
          .select({
            diagnosisItemsJson: diagnoses.diagnosisItems,
          })
          .from(diagnoses)
          .where(
            visit.sessionId
              ? eq(diagnoses.sessionId, visit.sessionId)
              : eq(diagnoses.visitId, visit.id)
          )
          .limit(1)

        if (diagnosisLegacyRows.length > 0 && diagnosisLegacyRows[0].diagnosisItemsJson) {
          const itemsJson = diagnosisLegacyRows[0].diagnosisItemsJson as Record<string, any>
          // diagnosisItemsテーブルから各アイテムの情報を取得
          const allDiagnosisItems = await db
            .select({
              id: diagnosisItems.id,
              question: diagnosisItems.question,
              answerType: diagnosisItems.answerType,
              options: diagnosisItems.options,
              categoryId: diagnosisItems.categoryId,
            })
            .from(diagnosisItems)

          for (const [itemId, value] of Object.entries(itemsJson)) {
            const itemInfo = allDiagnosisItems.find(i => i.id === itemId)
            diagnosisResponsesList.push({
              id: `legacy-${itemId}`,
              item_id: itemId,
              value: typeof value === 'object' ? JSON.stringify(value) : String(value),
              metadata: null,
              answered_at: null,
              diagnosis_items: itemInfo ? {
                id: itemInfo.id,
                question: itemInfo.question,
                answer_type: itemInfo.answerType,
                options: itemInfo.options,
                category_id: itemInfo.categoryId,
                diagnosis_categories: null,
              } : null,
            })
          }
        }
      }

      // レポートを取得
      let reportData = null
      const reportRows = await db
        .select({
          id: reports.id,
          reportType: reports.reportType,
          status: reports.status,
          content: reports.content,
          aiSummary: reports.aiSummary,
          ageConsideration: reports.ageConsideration,
          postureAnalysis: reports.postureAnalysis,
          oralAnalysis: reports.oralAnalysis,
          generatedAt: reports.generatedAt,
          sentToLine: reports.sentToLine,
          sentAt: reports.sentAt,
        })
        .from(reports)
        .where(eq(reports.visitId, visit.id))
        .orderBy(desc(reports.createdAt))
        .limit(1)

      if (reportRows.length > 0) {
        const r = reportRows[0]
        reportData = {
          id: r.id,
          report_type: r.reportType,
          status: r.status,
          content: r.content,
          ai_summary: r.aiSummary,
          age_consideration: r.ageConsideration,
          posture_analysis: r.postureAnalysis,
          oral_analysis: r.oralAnalysis,
          generated_at: r.generatedAt?.toISOString(),
          sent_to_line: r.sentToLine,
          sent_at: r.sentAt?.toISOString(),
        }
      }

      return NextResponse.json({
        success: true,
        visit: {
          id: visit.id,
          status: visit.status,
          visit_date: visit.visitDate,
          child_age_months: visit.childAgeMonths,
          session_id: visit.sessionId,
          children: childData ? {
            id: childData.id,
            first_name: childData.firstName,
            last_name: childData.lastName,
            first_name_kana: childData.firstNameKana,
            last_name_kana: childData.lastNameKana,
            birthday: childData.birthday,
            gender: childData.gender,
            parent_profile_id: childData.parentProfileId,
          } : null,
          parent: parentProfile ? {
            id: parentProfile.id,
            display_name: parentProfile.displayName,
            first_name: parentProfile.firstName,
            last_name: parentProfile.lastName,
            phone_number: parentProfile.phoneNumber,
            line_user_id: parentProfile.lineUserId,
            email: parentProfile.email,
          } : null,
          questionnaire_responses: questionnaireResponsesList,
          paper_questionnaire: paperQuestionnaireData,
          photos: photosList,
          diagnosis_responses: diagnosisResponsesList,
          report: reportData,
          questionnaire: null, // レガシー対応は省略
        },
      })
    }

    if (code) {
      // 受付番号（visit_idの先頭8文字）で検索
      const visitRows = await db
        .select({
          id: visits.id,
          status: visits.status,
          visitDate: visits.visitDate,
          childId: visits.childId,
        })
        .from(visits)
        .where(ilike(visits.id, `${code}%`))
        .limit(5)

      // 各visitのchildrenを取得
      const visitsWithChildren = await Promise.all(
        visitRows
          .filter(v => v.status === 'questionnaire_completed')
          .map(async (v) => {
            let childData = null
            if (v.childId) {
              const childRows = await db
                .select({
                  firstName: children.firstName,
                  lastName: children.lastName,
                })
                .from(children)
                .where(eq(children.id, v.childId))
                .limit(1)
              childData = childRows[0] || null
            }
            return {
              id: v.id,
              status: v.status,
              visit_date: v.visitDate,
              children: childData ? {
                first_name: childData.firstName,
                last_name: childData.lastName,
              } : null,
            }
          })
      )

      return NextResponse.json({ success: true, visits: visitsWithChildren })
    }

    return NextResponse.json(
      { success: false, error: 'invalid_params', message: 'visitIdまたはcodeを指定してください' },
      { status: 400 }
    )
  } catch (error) {
    console.error('セッション検索エラー:', error)
    return NextResponse.json(
      { success: false, error: 'server_error', message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST: セッション状態を更新（診断開始）
export async function POST(request: NextRequest) {
  try {
    const { visitId, staffId, action } = await request.json()

    if (!visitId || !staffId) {
      return NextResponse.json(
        { success: false, error: 'invalid_params', message: 'visitIdとstaffIdは必須です' },
        { status: 400 }
      )
    }

    // モックモードの場合
    if (isMockMode) {
      return NextResponse.json({
        success: true,
        visit: {
          id: visitId,
          status: action === 'start_diagnosis' ? 'diagnosis_started' : 'questionnaire_completed',
          staff_profile_id: staffId,
        },
      })
    }

    // セッション状態を更新
    const currentStep = action === 'start_diagnosis' ? 'diagnosis_started' : 'questionnaire_completed'

    const updatedRows = await db
      .update(visits)
      .set({
        status: 'in_progress',
        currentStep: currentStep,
        staffProfileId: staffId,
        updatedAt: new Date(),
      } as Partial<typeof visits.$inferInsert>)
      .where(eq(visits.id, visitId))
      .returning()

    if (updatedRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'not_found', message: '該当するセッションが見つかりません' },
        { status: 404 }
      )
    }

    const visit = updatedRows[0]

    return NextResponse.json({
      success: true,
      visit: {
        id: visit.id,
        status: visit.status,
        current_step: visit.currentStep,
        staff_profile_id: visit.staffProfileId,
      },
    })
  } catch (error) {
    console.error('セッション更新エラー:', error)
    return NextResponse.json(
      { success: false, error: 'server_error', message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
