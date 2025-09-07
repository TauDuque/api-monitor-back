-- CreateTable
CREATE TABLE "public"."AlertConfiguration" (
    "id" TEXT NOT NULL,
    "monitoredUrlId" TEXT NOT NULL,
    "emailRecipient" TEXT,
    "webhookUrl" TEXT,
    "notifyOnDown" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnUp" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlertConfiguration_monitoredUrlId_key" ON "public"."AlertConfiguration"("monitoredUrlId");

-- AddForeignKey
ALTER TABLE "public"."AlertConfiguration" ADD CONSTRAINT "AlertConfiguration_monitoredUrlId_fkey" FOREIGN KEY ("monitoredUrlId") REFERENCES "public"."MonitoredURL"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
