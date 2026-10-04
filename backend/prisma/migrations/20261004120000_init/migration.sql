-- CreateTable
CREATE TABLE "artworks" (
    "object_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "attribution" TEXT,
    "display_date" TEXT,
    "medium" TEXT,
    "dimensions" TEXT,
    "credit_line" TEXT,
    "classification" TEXT,
    "image_uuid" TEXT NOT NULL,
    "iiif_url" TEXT NOT NULL,
    "image_width" INTEGER,
    "image_height" INTEGER,
    "image_alt_text" TEXT,
    "vibrant" TEXT,
    "muted" TEXT,
    "imported_at" TIMESTAMP(3) NOT NULL,
    "removed_at" TIMESTAMP(3),

    CONSTRAINT "artworks_pkey" PRIMARY KEY ("object_id")
);

-- CreateTable
CREATE TABLE "daily_picks" (
    "day" DATE NOT NULL,
    "object_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_picks_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "dataset_imports" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "imported" INTEGER,
    "removed" INTEGER,
    "error" TEXT,

    CONSTRAINT "dataset_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "artworks_removed_at_idx" ON "artworks"("removed_at");

-- AddForeignKey
ALTER TABLE "daily_picks" ADD CONSTRAINT "daily_picks_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "artworks"("object_id") ON DELETE RESTRICT ON UPDATE CASCADE;

