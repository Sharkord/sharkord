WITH ranked AS (
  SELECT
    id,
    LOWER(identity) AS normalized_identity,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(identity)
      ORDER BY COALESCE(last_login_at, 0) DESC, id ASC
    ) AS row_number
  FROM users
)
DELETE FROM users
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE row_number > 1
);
--> statement-breakpoint
UPDATE users
SET identity = LOWER(identity)
WHERE identity <> LOWER(identity);
