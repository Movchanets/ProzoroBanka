using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UnifyCampaignItemsAndTph : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CampaignPurchases_Campaigns_CampaignId",
                table: "CampaignPurchases");

            migrationBuilder.DropForeignKey(
                name: "FK_ReceiptItemPhotos_ReceiptItems_ReceiptItemId",
                table: "ReceiptItemPhotos");

            migrationBuilder.DropTable(
                name: "ReceiptItems");
            
            // Clean up orphaned foreign keys before the constraint is created
            migrationBuilder.Sql("UPDATE \"ReceiptItemPhotos\" SET \"ReceiptItemId\" = NULL;");

            migrationBuilder.RenameColumn(
                name: "ReceiptItemId",
                table: "ReceiptItemPhotos",
                newName: "CampaignItemId");

            migrationBuilder.RenameIndex(
                name: "IX_ReceiptItemPhotos_ReceiptItemId",
                table: "ReceiptItemPhotos",
                newName: "IX_ReceiptItemPhotos_CampaignItemId");

            migrationBuilder.AlterColumn<Guid>(
                name: "CampaignId",
                table: "CampaignPurchases",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "Edrpou",
                table: "CampaignDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsRedacted",
                table: "CampaignDocuments",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OcrRawResult",
                table: "CampaignDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayerFullName",
                table: "CampaignDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentPurpose",
                table: "CampaignDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiptCode",
                table: "CampaignDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReceiverIban",
                table: "CampaignDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SenderIban",
                table: "CampaignDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SenderIbanOrCard",
                table: "CampaignDocuments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "TotalItemsAmount",
                table: "CampaignDocuments",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CampaignItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: true),
                    Name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: false),
                    UnitPrice = table.Column<long>(type: "bigint", precision: 18, scale: 2, nullable: false),
                    TotalPrice = table.Column<long>(type: "bigint", precision: 18, scale: 2, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    Barcode = table.Column<string>(type: "text", nullable: true),
                    VatRate = table.Column<decimal>(type: "numeric", nullable: true),
                    VatAmount = table.Column<decimal>(type: "numeric", nullable: true),
                    ReceiptId = table.Column<Guid>(type: "uuid", nullable: true),
                    CampaignDocumentId = table.Column<Guid>(type: "uuid", nullable: true),
                    InvoiceDocumentId = table.Column<Guid>(type: "uuid", nullable: true),
                    WaybillDocumentId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CampaignItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CampaignItems_CampaignDocuments_CampaignDocumentId",
                        column: x => x.CampaignDocumentId,
                        principalTable: "CampaignDocuments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CampaignItems_CampaignDocuments_InvoiceDocumentId",
                        column: x => x.InvoiceDocumentId,
                        principalTable: "CampaignDocuments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CampaignItems_CampaignDocuments_WaybillDocumentId",
                        column: x => x.WaybillDocumentId,
                        principalTable: "CampaignDocuments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CampaignItems_Campaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "Campaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CampaignItems_Receipts_ReceiptId",
                        column: x => x.ReceiptId,
                        principalTable: "Receipts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CampaignItems_CampaignDocumentId",
                table: "CampaignItems",
                column: "CampaignDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignItems_CampaignId",
                table: "CampaignItems",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignItems_InvoiceDocumentId",
                table: "CampaignItems",
                column: "InvoiceDocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignItems_ReceiptId",
                table: "CampaignItems",
                column: "ReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignItems_WaybillDocumentId",
                table: "CampaignItems",
                column: "WaybillDocumentId");

            migrationBuilder.AddForeignKey(
                name: "FK_CampaignPurchases_Campaigns_CampaignId",
                table: "CampaignPurchases",
                column: "CampaignId",
                principalTable: "Campaigns",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ReceiptItemPhotos_CampaignItems_CampaignItemId",
                table: "ReceiptItemPhotos",
                column: "CampaignItemId",
                principalTable: "CampaignItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CampaignPurchases_Campaigns_CampaignId",
                table: "CampaignPurchases");

            migrationBuilder.DropForeignKey(
                name: "FK_ReceiptItemPhotos_CampaignItems_CampaignItemId",
                table: "ReceiptItemPhotos");

            migrationBuilder.DropTable(
                name: "CampaignItems");

            migrationBuilder.DropColumn(
                name: "Edrpou",
                table: "CampaignDocuments");

            migrationBuilder.DropColumn(
                name: "IsRedacted",
                table: "CampaignDocuments");

            migrationBuilder.DropColumn(
                name: "OcrRawResult",
                table: "CampaignDocuments");

            migrationBuilder.DropColumn(
                name: "PayerFullName",
                table: "CampaignDocuments");

            migrationBuilder.DropColumn(
                name: "PaymentPurpose",
                table: "CampaignDocuments");

            migrationBuilder.DropColumn(
                name: "ReceiptCode",
                table: "CampaignDocuments");

            migrationBuilder.DropColumn(
                name: "ReceiverIban",
                table: "CampaignDocuments");

            migrationBuilder.DropColumn(
                name: "SenderIban",
                table: "CampaignDocuments");

            migrationBuilder.DropColumn(
                name: "SenderIbanOrCard",
                table: "CampaignDocuments");

            migrationBuilder.DropColumn(
                name: "TotalItemsAmount",
                table: "CampaignDocuments");

            migrationBuilder.RenameColumn(
                name: "CampaignItemId",
                table: "ReceiptItemPhotos",
                newName: "ReceiptItemId");

            migrationBuilder.RenameIndex(
                name: "IX_ReceiptItemPhotos_CampaignItemId",
                table: "ReceiptItemPhotos",
                newName: "IX_ReceiptItemPhotos_ReceiptItemId");

            migrationBuilder.AlterColumn<Guid>(
                name: "CampaignId",
                table: "CampaignPurchases",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "ReceiptItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceiptId = table.Column<Guid>(type: "uuid", nullable: false),
                    Barcode = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    Name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    VatAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    VatRate = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReceiptItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReceiptItems_Receipts_ReceiptId",
                        column: x => x.ReceiptId,
                        principalTable: "Receipts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptItems_ReceiptId",
                table: "ReceiptItems",
                column: "ReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptItems_ReceiptId_SortOrder",
                table: "ReceiptItems",
                columns: new[] { "ReceiptId", "SortOrder" });

            migrationBuilder.AddForeignKey(
                name: "FK_CampaignPurchases_Campaigns_CampaignId",
                table: "CampaignPurchases",
                column: "CampaignId",
                principalTable: "Campaigns",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ReceiptItemPhotos_ReceiptItems_ReceiptItemId",
                table: "ReceiptItemPhotos",
                column: "ReceiptItemId",
                principalTable: "ReceiptItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
