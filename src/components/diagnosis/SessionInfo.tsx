'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SessionData, QuestionnaireData } from '@/types/diagnosis'

interface SessionInfoProps {
    session: SessionData
    questionnaire?: QuestionnaireData
}

export function SessionInfo({ session, questionnaire }: SessionInfoProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="text-lg">セッション情報</span>
                    <Badge variant="outline" className="text-xs">
                        {session.session_id}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 基本情報 */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-gray-500 mb-1">お子さま</p>
                        <p className="font-medium text-gray-900">
                            {questionnaire?.child_name || session.child_name || '未入力'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">年齢</p>
                        <p className="font-medium text-gray-900">
                            {questionnaire?.child_age || session.child_age || '-'}歳
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">性別</p>
                        <p className="font-medium text-gray-900">
                            {questionnaire?.child_gender || session.child_gender || '未入力'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-1">保護者</p>
                        <p className="font-medium text-gray-900">
                            {session.parent_name || '未入力'}
                        </p>
                    </div>
                </div>

                {/* 問診票情報 */}
                {questionnaire && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                        {questionnaire.medical_history && questionnaire.medical_history.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-500 mb-1">既往歴</p>
                                <div className="flex flex-wrap gap-1">
                                    {questionnaire.medical_history.map((item, index) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                            {item}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {questionnaire.concerns && questionnaire.concerns.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-500 mb-1">気になること</p>
                                <div className="flex flex-wrap gap-1">
                                    {questionnaire.concerns.map((item, index) => (
                                        <Badge key={index} variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                            {item}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {questionnaire.ideal_goals && questionnaire.ideal_goals.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-500 mb-1">理想の状態</p>
                                <div className="flex flex-wrap gap-1">
                                    {questionnaire.ideal_goals.map((item, index) => (
                                        <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                            {item}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {questionnaire.notes && (
                            <div>
                                <p className="text-xs text-gray-500 mb-1">その他メモ</p>
                                <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                    {questionnaire.notes}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
