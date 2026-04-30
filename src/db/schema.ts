import { boolean, date, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username').notNull(),
    email: varchar('email').notNull().unique(),
    passwordHash: varchar('password_hash').notNull(),
    avatarUrl: varchar('avatar_url'),
    color: varchar('color'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const league = pgTable('league', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name').notNull(),
    adminId: uuid('admin_id').notNull().references(() => user.id),
    createdAt: timestamp('created_at').defaultNow(),
});

export const leagueMember = pgTable('league_member', {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id').notNull().references(() => league.id),
    userId: uuid('user_id').notNull().references(() => user.id),
    joinedAt: timestamp('joined_at').defaultNow(),
});

export const tournament = pgTable('tournament', {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id').notNull().references(() => league.id),
    name: varchar('name').notNull(),
    date: date('date'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const game = pgTable('game', {
    id: uuid('id').primaryKey().defaultRandom(),
    tournamentId: uuid('tournament_id').notNull().references(() => tournament.id),
    mode: varchar('mode').notNull(),
    isFinished: boolean('is_finished').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

export const gameScore = pgTable('game_score', {
    id: uuid('id').primaryKey().defaultRandom(),
    gameId: uuid('game_id').notNull().references(() => game.id),
    userId: uuid('user_id').notNull().references(() => user.id),
    points: integer('points').default(0),
    updatedAt: timestamp('updated_at').defaultNow(),
});
