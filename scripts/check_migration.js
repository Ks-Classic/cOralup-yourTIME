const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Helper to load env
function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return;
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            let value = match[2];
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[match[1]] = value;
        }
    });
    return env;
}

async function main() {
    const envLocal = loadEnv(path.join(__dirname, '../.env.local'));
    const url = envLocal.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || envLocal.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envLocal.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.error('Missing Supabase URL or Key');
        process.exit(1);
    }

    console.log('Key length:', key.length);
    console.log('Key start:', key.substring(0, 5) + '...');
    console.log('Connecting to Supabase:', url);
    const supabase = createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    });

    // Try to select the new column
    const { data, error } = await supabase
        .from('line_message_logs')
        .select('staff_confirmation_status')
        .limit(1);

    if (error) {
        console.error('Migration Status: FAILED / NOT APPLIED');
        console.error('Error details:', error.message);
        console.error('Raw error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Migration Status: APPLIED');
        console.log('Column staff_confirmation_status exists and is queryable.');
    }
}

main().catch(err => console.error(err));
