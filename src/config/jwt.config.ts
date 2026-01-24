import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
    secret: process.env.JWT_SECRET || '2d7cc886e1649e317d99daa654746236b80cf9037b9846978a659920d6d961888e6aa51dfd3af46c97dd180611382bfccd23111a8ca24d290f22dcd0fdb5c988',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || '183ee5f1ffe79404c614b805b94c3feab06fa818c7956c2ea25de6ddff7d7cba02142f4c679b2cb38bdd2f7b49752a9452b251058352714bd6de4c98bc11b4e6',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
}));
