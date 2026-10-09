import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// 系统表（保留，勿删）
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow(),
});

// 候选人（按活动隔离）
export const candidates = pgTable(
  "candidates",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: integer("activity_id").default(1).notNull(),
    code: varchar("code", { length: 20 }).notNull(),
    employee_no: varchar("employee_no", { length: 50 }),
    name: varchar("name", { length: 50 }).notNull(),
    department: varchar("department", { length: 100 }).notNull(),
    position: varchar("position", { length: 100 }),
    avatar_url: text("avatar_url"),
    intro: varchar("intro", { length: 500 }),
    sort_weight: integer("sort_weight").default(0).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("candidates_code_idx").on(table.activity_id, table.code),
    index("candidates_activity_idx").on(table.activity_id),
    index("candidates_status_idx").on(table.status),
    index("candidates_sort_idx").on(table.sort_weight),
  ]
);

// 投票人（预置清单：openid 为空，登录校验时绑定；按活动隔离）
export const voters = pgTable(
  "voters",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: integer("activity_id").default(1).notNull(),
    openid: varchar("openid", { length: 128 }),
    name: varchar("name", { length: 50 }),
    employee_no: varchar("employee_no", { length: 50 }),
    department: varchar("department", { length: 100 }),
    has_voted: boolean("has_voted").default(false).notNull(),
    voted_at: timestamp("voted_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("voters_openid_idx")
      .on(table.activity_id, table.openid)
      .where(sql`openid IS NOT NULL`),
    uniqueIndex("voters_employee_no_idx")
      .on(table.activity_id, table.employee_no)
      .where(sql`employee_no IS NOT NULL`),
    index("voters_activity_idx").on(table.activity_id),
  ]
);

// 全局投票账号（工号 + 密码，跨活动通用；密码为空表示首次登录未改密）
export const voterAccounts = pgTable(
  "voter_accounts",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    employee_no: varchar("employee_no", { length: 50 }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    department: varchar("department", { length: 100 }),
    position: varchar("position", { length: 100 }),
    intro: varchar("intro", { length: 500 }),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    password_hash: varchar("password_hash", { length: 200 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("voter_accounts_employee_no_idx").on(table.employee_no)]
);

// 投票提交记录（一次提交 = 多张选票；按活动隔离）
export const voteSubmissions = pgTable(
  "vote_submissions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: integer("activity_id").default(1).notNull(),
    voter_id: varchar("voter_id", { length: 36 }).notNull().references(() => voters.id),
    idempotency_token: varchar("idempotency_token", { length: 128 }).notNull(),
    ip: varchar("ip", { length: 64 }),
    device_fingerprint: varchar("device_fingerprint", { length: 128 }),
    picks_count: integer("picks_count").default(0).notNull(),
    submitted_at: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("vote_submissions_voter_idx").on(table.activity_id, table.voter_id),
    uniqueIndex("vote_submissions_token_idx").on(table.activity_id, table.idempotency_token),
  ]
);

// 选票明细（按活动隔离）
export const votes = pgTable(
  "votes",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    activity_id: integer("activity_id").default(1).notNull(),
    submission_id: varchar("submission_id", { length: 36 }).notNull().references(() => voteSubmissions.id),
    voter_id: varchar("voter_id", { length: 36 }).references(() => voters.id),
    candidate_id: varchar("candidate_id", { length: 36 }).notNull().references(() => candidates.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("votes_submission_idx").on(table.submission_id),
    index("votes_candidate_idx").on(table.candidate_id),
    index("votes_voter_idx").on(table.voter_id),
    index("votes_activity_idx").on(table.activity_id),
  ]
);

// 规则配置（单行，id 固定为 1）
export const voteConfig = pgTable("vote_config", {
  id: serial("id").primaryKey(),
  activity_name: varchar("activity_name", { length: 100 }).default("").notNull(),
  main_title: varchar("main_title", { length: 200 }).default("").notNull(),
  subtitle: varchar("subtitle", { length: 200 }).default("").notNull(),
  organizer: varchar("organizer", { length: 100 }).default("").notNull(),
  description: text("description"),
  start_time: timestamp("start_time", { withTimezone: true }),
  end_time: timestamp("end_time", { withTimezone: true }),
  min_picks: integer("min_picks").default(1).notNull(),
  max_picks: integer("max_picks").default(9).notNull(),
  candidate_pool_size: integer("candidate_pool_size").default(90).notNull(),
  winner_count: integer("winner_count").default(9).notNull(),
  allow_duplicate: boolean("allow_duplicate").default(false).notNull(),
  allow_modify: boolean("allow_modify").default(false).notNull(),
  anonymous: boolean("anonymous").default(false).notNull(),
  realtime_public: boolean("realtime_public").default(false).notNull(),
  result_publish_time: timestamp("result_publish_time", { withTimezone: true }),
  candidate_sort: varchar("candidate_sort", { length: 20 }).default("code_asc").notNull(),
  page_size: integer("page_size").default(20).notNull(),
  enable_department_filter: boolean("enable_department_filter").default(true).notNull(),
  device_vote_limit: integer("device_vote_limit").default(1).notNull(),
  ip_vote_limit: integer("ip_vote_limit").default(50).notNull(),
  tie_strategy: varchar("tie_strategy", { length: 20 }).default("code_first").notNull(),
  status: varchar("status", { length: 20 }).default("ongoing").notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 管理员
export const admins = pgTable(
  "admins",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    account: varchar("account", { length: 50 }).notNull(),
    password_hash: varchar("password_hash", { length: 200 }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    role: varchar("role", { length: 20 }).default("operator").notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(),
    last_login_at: timestamp("last_login_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("admins_account_idx").on(table.account)]
);

// 操作日志
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    admin_id: varchar("admin_id", { length: 36 }).references(() => admins.id),
    admin_name: varchar("admin_name", { length: 50 }),
    action: varchar("action", { length: 50 }).notNull(),
    target: varchar("target", { length: 100 }),
    params_summary: text("params_summary"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_admin_idx").on(table.admin_id),
    index("audit_logs_created_idx").on(table.created_at),
  ]
);

// 导入批次
export const importBatches = pgTable(
  "import_batches",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    file_name: varchar("file_name", { length: 200 }).notNull(),
    total_rows: integer("total_rows").default(0).notNull(),
    success_rows: integer("success_rows").default(0).notNull(),
    fail_rows: integer("fail_rows").default(0).notNull(),
    error_detail: jsonb("error_detail"),
    operator: varchar("operator", { length: 50 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("import_batches_created_idx").on(table.created_at)]
);
