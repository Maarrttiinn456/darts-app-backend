import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from './index';
import { game, gameScore, league, leagueMember, tournament, user } from './schema';

async function seed() {
    console.log('Seeding dev database...');

    // Clear in FK-safe order
    await db.delete(gameScore);
    await db.delete(game);
    await db.delete(tournament);
    await db.delete(leagueMember);
    await db.delete(league);
    await db.delete(user);
    console.log('Cleared existing data');

    const passwordHash = await bcrypt.hash('password123', 10);

    const users = await db
        .insert(user)
        .values([
            { username: 'Adam Admin', email: 'admin@darts.dev', passwordHash, color: '#e74c3c' },
            { username: 'Pavel Novák', email: 'player1@darts.dev', passwordHash, color: '#3498db' },
            { username: 'Jana Svobodová', email: 'player2@darts.dev', passwordHash, color: '#2ecc71' },
            { username: 'Tomáš Král', email: 'player3@darts.dev', passwordHash, color: '#f39c12' },
        ])
        .returning();
    console.log(`Inserted ${users.length} users`);

    const [admin, player1, player2, player3] = users;

    const [liga] = await db
        .insert(league)
        .values({ name: 'Pražská šipkařská liga', adminId: admin.id })
        .returning();
    console.log('Inserted league');

    await db.insert(leagueMember).values([
        { leagueId: liga.id, userId: admin.id },
        { leagueId: liga.id, userId: player1.id },
        { leagueId: liga.id, userId: player2.id },
        { leagueId: liga.id, userId: player3.id },
    ]);
    console.log('Inserted league members');

    const [tournament1, tournament2] = await db
        .insert(tournament)
        .values([
            { leagueId: liga.id, name: 'Jarní turnaj 2024', date: '2024-03-15' },
            { leagueId: liga.id, name: 'Letní turnaj 2024', date: '2024-06-20' },
        ])
        .returning();
    console.log('Inserted tournaments');

    const allPlayers = [admin, player1, player2, player3];

    const gamesData = [
        { tournamentId: tournament1.id, mode: '501', isFinished: true },
        { tournamentId: tournament1.id, mode: '301', isFinished: true },
        { tournamentId: tournament1.id, mode: '501', isFinished: false },
        { tournamentId: tournament2.id, mode: '501', isFinished: false },
    ];

    const scoresByGame = [
        [320, 180, 250, 290],
        [150, 200, 120, 180],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ];

    const games = await db.insert(game).values(gamesData).returning();
    console.log(`Inserted ${games.length} games`);

    const scores = games.flatMap((g, gi) =>
        allPlayers.map((p, pi) => ({
            gameId: g.id,
            userId: p.id,
            points: scoresByGame[gi][pi],
        }))
    );

    await db.insert(gameScore).values(scores);
    console.log(`Inserted ${scores.length} game scores`);

    console.log('Done.');
    process.exit(0);
}

seed().catch((err) => {
    console.error(err);
    process.exit(1);
});
