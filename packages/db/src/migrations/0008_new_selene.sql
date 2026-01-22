-- First drop defaults, then convert type, then set new defaults
ALTER TABLE "prd_sessions" ALTER COLUMN "skip_domain_step" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "prd_sessions" ALTER COLUMN "skip_domain_step" SET DATA TYPE boolean USING CASE WHEN skip_domain_step = 'true' THEN true ELSE false END;--> statement-breakpoint
ALTER TABLE "prd_sessions" ALTER COLUMN "skip_domain_step" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "prd_sessions" ALTER COLUMN "skip_domain_step" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prd_sessions" ALTER COLUMN "skip_innovation_step" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "prd_sessions" ALTER COLUMN "skip_innovation_step" SET DATA TYPE boolean USING CASE WHEN skip_innovation_step = 'true' THEN true ELSE false END;--> statement-breakpoint
ALTER TABLE "prd_sessions" ALTER COLUMN "skip_innovation_step" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "prd_sessions" ALTER COLUMN "skip_innovation_step" SET NOT NULL;
