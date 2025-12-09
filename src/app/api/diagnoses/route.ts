import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      postureAnalysis,
      oralAnalysis,
      diagnosisItems,
      staffNotes,
      photos = [],
    } = body

    // バリデーション
    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが指定されていません' },
        { status: 400 }
      )
    }

    // 1. 診断結果の保存 (旧互換テーブル)
    const { data: diagnosis, error } = await supabase
      .from('diagnoses')
      .upsert([
        {
          session_id: sessionId,
          posture_analysis: postureAnalysis,
          oral_analysis: oralAnalysis,
          diagnosis_items: diagnosisItems,
          staff_notes: staffNotes,
          photos: photos,
        }
      ], { onConflict: 'session_id' })
      .select()
      .single()

    if (error) {
      console.error('Error saving diagnosis:', error)
      return NextResponse.json(
        { error: '診断結果の保存に失敗しました' },
        { status: 500 }
      )
    }

    // 2. 診断項目別回答の保存 (正規化テーブル)
    if (diagnosisItems && Object.keys(diagnosisItems).length > 0) {
      const responseRecords = Object.entries(diagnosisItems).map(([itemId, value]) => {
        // 値のシリアライズ: オブジェクトや配列はJSON文字列化
        let serializedValue = value;
        if (typeof value === 'object' && value !== null) {
          serializedValue = JSON.stringify(value);
        } else {
          serializedValue = String(value);
        }

        return {
          session_id: sessionId,
          item_id: itemId,
          value: serializedValue,
          answered_at: new Date().toISOString(),
          // metadata: 今後写真情報などをここに関連付ける場合は追加
        };
      });

      // itemIdの重複（同じセッション内）を考慮してupsertを使用
      const { error: responseError } = await supabase
        .from('diagnosis_responses')
        .upsert(responseRecords, { onConflict: 'session_id, item_id' });

      if (responseError) {
        console.error('Error saving diagnosis responses:', responseError);
        // 正規化テーブルへの保存失敗はログに残すが、処理自体は一旦成功として返すか、エラーにするか判断が必要。
        // ここではデータの整合性を重視してエラー応答とする
        return NextResponse.json(
          { error: '詳細データの保存に失敗しました' },
          { status: 500 }
        )
      }
    }

    // セッションのステータスを更新
    await supabase
      .from('sessions')
      .update({ status: 'diagnosis_completed' })
      .eq('session_id', sessionId)

    return NextResponse.json(diagnosis, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが指定されていません' },
        { status: 400 }
      )
    }

    const { data: diagnosis, error } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error) {
      console.error('Error fetching diagnosis:', error)
      return NextResponse.json(
        { error: '診断結果の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(diagnosis)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが指定されていません' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { postureAnalysis, oralAnalysis, diagnosisItems, staffNotes, photos } = body

    // 1. 診断結果の更新 (旧互換テーブル)
    const { data: diagnosis, error } = await supabase
      .from('diagnoses')
      .update({
        posture_analysis: postureAnalysis,
        oral_analysis: oralAnalysis,
        diagnosis_items: diagnosisItems,
        staff_notes: staffNotes,
        photos: photos,
        updated_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating diagnosis:', error)
      return NextResponse.json(
        { error: '診断結果の更新に失敗しました' },
        { status: 500 }
      )
    }

    // 2. 診断項目別回答の更新 (正規化テーブル)
    if (diagnosisItems && Object.keys(diagnosisItems).length > 0) {
      const responseRecords = Object.entries(diagnosisItems).map(([itemId, value]) => {
        let serializedValue = value;
        if (typeof value === 'object' && value !== null) {
          serializedValue = JSON.stringify(value);
        } else {
          serializedValue = String(value);
        }

        return {
          session_id: sessionId,
          item_id: itemId,
          value: serializedValue,
          answered_at: new Date().toISOString(),
        };
      });

      const { error: responseError } = await supabase
        .from('diagnosis_responses')
        .upsert(responseRecords, { onConflict: 'session_id, item_id' });

      if (responseError) {
        console.error('Error updating diagnosis responses:', responseError);
        return NextResponse.json(
          { error: '詳細データの更新に失敗しました' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(diagnosis)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

