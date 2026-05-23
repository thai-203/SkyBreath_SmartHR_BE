import mysql from 'mysql2/promise';

async function run() {
    const connection = await mysql.createConnection({
        host: '103.72.97.24',
        user: 'team_dev',
        password: 'TeamDev@12345',
        database: 'smarthr_db',
        port: 3306
    });

    try {
        console.log("=== QUY TẮC TĂNG CA (OVERTIME RULES) ===");
        const [rules] = await connection.execute(
            `SELECT * FROM overtime_rules`
        );
        console.log(rules);

        console.log("=== PHÒNG BAN ÁP DỤNG QUY TẮC TĂNG CA ===");
        const [ruleDepts] = await connection.execute(
            `SELECT * FROM overtime_rule_departments`
        );
        console.log(ruleDepts);
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}

run();
