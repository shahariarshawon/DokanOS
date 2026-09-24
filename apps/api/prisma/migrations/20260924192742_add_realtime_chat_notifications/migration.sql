-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ORDER_STATUS', 'PAYMENT_SUCCESS', 'CHAT_MESSAGE', 'SYSTEM_ALERT', 'STOCK_LOW', 'SELLER_UPDATE');

-- DropIndex
DROP INDEX "product_embeddings_embedding_idx";

-- AlterTable
ALTER TABLE "product_embeddings" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customerId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "orderId" UUID,
    "lastMessageAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_customerId_lastMessageAt_idx" ON "conversations"("customerId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversations_storeId_lastMessageAt_idx" ON "conversations"("storeId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_customerId_storeId_orderId_key" ON "conversations"("customerId", "storeId", "orderId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_senderId_isRead_idx" ON "messages"("senderId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
