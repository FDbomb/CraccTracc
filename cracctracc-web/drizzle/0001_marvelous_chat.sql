CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"file_hash" text NOT NULL,
	"file_name" text NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"total_distance" real NOT NULL,
	"max_speed" real NOT NULL,
	"average_speed" real NOT NULL,
	"tack_count" integer NOT NULL,
	"gybe_count" integer NOT NULL,
	"average_twa" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analyses_file_hash_unique" UNIQUE("file_hash")
);
--> statement-breakpoint
CREATE TABLE "manoeuvres" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"type" text NOT NULL,
	"timestamp" timestamp NOT NULL,
	"duration" real,
	"start_twa" real,
	"end_twa" real
);
--> statement-breakpoint
CREATE TABLE "track_points" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"utc" timestamp NOT NULL,
	"lat" real NOT NULL,
	"lon" real NOT NULL,
	"sog" real,
	"cog" real,
	"hdg" real,
	"twa" real,
	"tws" real,
	"twd" real,
	"roll" real,
	"pitch" real
);
--> statement-breakpoint
CREATE TABLE "user_analyses" (
	"user_id" text NOT NULL,
	"analysis_id" text NOT NULL,
	CONSTRAINT "user_analyses_user_id_analysis_id_pk" PRIMARY KEY("user_id","analysis_id")
);
--> statement-breakpoint
ALTER TABLE "manoeuvres" ADD CONSTRAINT "manoeuvres_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_points" ADD CONSTRAINT "track_points_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_analyses" ADD CONSTRAINT "user_analyses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_analyses" ADD CONSTRAINT "user_analyses_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;