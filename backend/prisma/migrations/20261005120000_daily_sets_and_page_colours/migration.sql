-- AlterTable
ALTER TABLE "artworks" ADD COLUMN     "dark_colour" TEXT,
ADD COLUMN     "light_colour" TEXT;

-- CreateTable
CREATE TABLE "daily_set_items" (
    "day" DATE NOT NULL,
    "position" INTEGER NOT NULL,
    "object_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_set_items_pkey" PRIMARY KEY ("day","position")
);

-- AddForeignKey
ALTER TABLE "daily_set_items" ADD CONSTRAINT "daily_set_items_object_id_fkey" FOREIGN KEY ("object_id") REFERENCES "artworks"("object_id") ON DELETE RESTRICT ON UPDATE CASCADE;

