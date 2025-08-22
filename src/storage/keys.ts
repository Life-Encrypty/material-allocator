export const DB_VERSION = 'v1';

export const K = {
  users:        `db:${DB_VERSION}:users`,
  projects:     `db:${DB_VERSION}:projects`,
  memberships:  `db:${DB_VERSION}:memberships`,
  materials:    `db:${DB_VERSION}:materials`,
  invActiveId:  `db:${DB_VERSION}:inventory:active`,
  invSnapshots: `db:${DB_VERSION}:inventory:snapshots`,
  invRows:      (id: string) => `db:${DB_VERSION}:inventory:${id}:rows`,
  requirements: `db:${DB_VERSION}:requirements`,
};