/**
 * cOralup 負荷テストスクリプト (k6)
 * 
 * 使用方法:
 *   1. k6 をインストール: brew install k6
 *   2. 環境変数を設定: export BASE_URL=https://coralup-yourtime.vercel.app
 *   3. 実行: k6 run tests/load/api-load-test.js
 * 
 * シナリオ:
 *   - light: 軽負荷テスト（最大10ユーザー）
 *   - normal: 通常負荷テスト（最大20ユーザー）
 *   - stress: ストレステスト（最大50ユーザー）
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// カスタムメトリクス
const apiErrors = new Counter('api_errors');
const questionnaireLatency = new Trend('questionnaire_latency');
const schemaLatency = new Trend('schema_latency');

// 環境変数 or デフォルト
const BASE_URL = __ENV.BASE_URL || 'https://coralup-yourtime.vercel.app';

// テストオプション
export const options = {
    scenarios: {
        // 軽負荷テスト
        light: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 5 },
                { duration: '1m', target: 10 },
                { duration: '30s', target: 0 },
            ],
            gracefulRampDown: '10s',
            exec: 'publicApiTest',
        },
        // 通常負荷テスト（デフォルト無効）
        // normal: {
        //   executor: 'ramping-vus',
        //   startVUs: 0,
        //   stages: [
        //     { duration: '30s', target: 10 },
        //     { duration: '1m', target: 20 },
        //     { duration: '2m', target: 20 },
        //     { duration: '30s', target: 0 },
        //   ],
        //   gracefulRampDown: '10s',
        //   exec: 'publicApiTest',
        // },
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'],  // 95%が3秒以内
        http_req_failed: ['rate<0.05'],     // エラー率5%未満
        api_errors: ['count<10'],            // APIエラー10件未満
        questionnaire_latency: ['p(95)<2000'],
        schema_latency: ['p(95)<2000'],
    },
};

/**
 * 公開APIのテスト
 */
export function publicApiTest() {
    group('Public API Tests', () => {
        // 1. 問診項目取得（未就学児）
        group('Questionnaire Items - Preschool', () => {
            const res = http.get(`${BASE_URL}/api/questionnaire/items?target_age=preschool`);

            const passed = check(res, {
                'status is 200': (r) => r.status === 200,
                'has items': (r) => {
                    try {
                        const body = JSON.parse(r.body);
                        return body.items && body.items.length > 0;
                    } catch {
                        return false;
                    }
                },
                'latency < 2s': (r) => r.timings.duration < 2000,
            });

            questionnaireLatency.add(res.timings.duration);

            if (!passed) {
                apiErrors.add(1);
            }
        });

        sleep(1);

        // 2. 問診項目取得（小学生）
        group('Questionnaire Items - Elementary', () => {
            const res = http.get(`${BASE_URL}/api/questionnaire/items?target_age=elementary`);

            check(res, {
                'status is 200': (r) => r.status === 200,
                'latency < 2s': (r) => r.timings.duration < 2000,
            });

            questionnaireLatency.add(res.timings.duration);
        });

        sleep(1);

        // 3. 診断スキーマ取得
        group('Diagnosis Schema', () => {
            const res = http.get(`${BASE_URL}/api/diagnosis-schema`);

            const passed = check(res, {
                'status is 200': (r) => r.status === 200,
                'has categories': (r) => {
                    try {
                        const body = JSON.parse(r.body);
                        return body.success && body.data && body.data.categories;
                    } catch {
                        return false;
                    }
                },
                'latency < 2s': (r) => r.timings.duration < 2000,
            });

            schemaLatency.add(res.timings.duration);

            if (!passed) {
                apiErrors.add(1);
            }
        });

        sleep(2);
    });
}

/**
 * フルフローのシミュレーション（認証が必要なため、モック向け）
 */
export function fullFlowSimulation() {
    group('Full Flow Simulation', () => {
        // このシナリオは認証が必要なため、
        // 実際のテストには適切なトークン設定が必要

        // 1. ページロード（静的アセット）
        group('Page Load', () => {
            const res = http.get(`${BASE_URL}/`);
            check(res, {
                'homepage loads': (r) => r.status === 200,
            });
        });

        sleep(2);

        // 2. スキーマ取得
        group('Load Schemas', () => {
            http.batch([
                ['GET', `${BASE_URL}/api/questionnaire/items?target_age=preschool`],
                ['GET', `${BASE_URL}/api/diagnosis-schema`],
            ]);
        });

        sleep(3);
    });
}

/**
 * ストレステスト用シナリオ
 */
export function stressTest() {
    const responses = http.batch([
        ['GET', `${BASE_URL}/api/questionnaire/items?target_age=preschool`],
        ['GET', `${BASE_URL}/api/questionnaire/items?target_age=elementary`],
        ['GET', `${BASE_URL}/api/diagnosis-schema`],
    ]);

    responses.forEach((res, index) => {
        check(res, {
            [`request ${index} succeeded`]: (r) => r.status === 200,
        });
    });

    sleep(0.5);
}

/**
 * デフォルトエクスポート（シナリオ未指定時）
 */
export default function () {
    publicApiTest();
}

/**
 * テスト完了時のサマリー出力
 */
export function handleSummary(data) {
    console.log('\n========== Load Test Summary ==========\n');

    const metrics = data.metrics;

    console.log(`Total Requests: ${metrics.http_reqs?.values?.count || 'N/A'}`);
    console.log(`Failed Requests: ${metrics.http_req_failed?.values?.rate?.toFixed(4) * 100 || 0}%`);
    console.log(`Avg Duration: ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 'N/A'}ms`);
    console.log(`P95 Duration: ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'}ms`);
    console.log(`API Errors: ${metrics.api_errors?.values?.count || 0}`);

    console.log('\n========================================\n');

    return {
        'stdout': JSON.stringify(data.metrics, null, 2),
    };
}
