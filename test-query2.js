import { AppDataSource } from './src/database/data-source.js';
import { PenaltyEntity } from './src/models/entities/penalty.entity.js';

async function test() {
    await AppDataSource.initialize();
    
    const penaltyRepo = AppDataSource.getRepository(PenaltyEntity);
    const penaltyRules = await penaltyRepo.find({
        where: { status: 'ACTIVE', isDeleted: false }
    });
    console.log("Active Penalty Rules:");
    console.log(JSON.stringify(penaltyRules, null, 2));

    process.exit(0);
}

test().catch(console.error);
