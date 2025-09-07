-- CreateTable
CREATE TABLE "public"."URLCheck" (
    "id" TEXT NOT NULL,
    "monitoredUrlId" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "responseTime" INTEGER NOT NULL,
    "isOnline" BOOLEAN NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "URLCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Incident" (
    "id" TEXT NOT NULL,
    "monitoredUrlId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."URLCheck" ADD CONSTRAINT "URLCheck_monitoredUrlId_fkey" FOREIGN KEY ("monitoredUrlId") REFERENCES "public"."MonitoredURL"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Incident" ADD CONSTRAINT "Incident_monitoredUrlId_fkey" FOREIGN KEY ("monitoredUrlId") REFERENCES "public"."MonitoredURL"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
