-- The story behind each artwork, researched lazily. Additive only.
-- CreateTable
CREATE TABLE "artwork_stories" (
    "object_id" INTEGER NOT NULL,
    "story" TEXT,
    "sources" JSONB,
    "model" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "attempted_at" TIMESTAMP(3) NOT NULL,
    "written_at" TIMESTAMP(3),

    CONSTRAINT "artwork_stories_pkey" PRIMARY KEY ("object_id")
);

-- AddForeignKey
ALTER TABLE "artwork_stories" ADD CONSTRAINT "artwork_stories_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "artworks"("object_id") ON DELETE RESTRICT ON UPDATE CASCADE;

