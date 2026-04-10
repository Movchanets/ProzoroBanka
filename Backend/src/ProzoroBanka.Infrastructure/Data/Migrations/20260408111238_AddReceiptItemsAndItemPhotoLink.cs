using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReceiptItemsAndItemPhotoLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReceiptItemId",
                table: "ReceiptItemPhotos",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ReceiptItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReceiptId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric(18,3)", precision: 18, scale: 3, nullable: true),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    TotalPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Barcode = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    VatRate = table.Column<decimal>(type: "numeric(8,3)", precision: 8, scale: 3, nullable: true),
                    VatAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
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
                name: "IX_ReceiptItemPhotos_ReceiptItemId",
                table: "ReceiptItemPhotos",
                column: "ReceiptItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptItems_ReceiptId",
                table: "ReceiptItems",
                column: "ReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_ReceiptItems_ReceiptId_SortOrder",
                table: "ReceiptItems",
                columns: new[] { "ReceiptId", "SortOrder" });

            migrationBuilder.AddForeignKey(
                name: "FK_ReceiptItemPhotos_ReceiptItems_ReceiptItemId",
                table: "ReceiptItemPhotos",
                column: "ReceiptItemId",
                principalTable: "ReceiptItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReceiptItemPhotos_ReceiptItems_ReceiptItemId",
                table: "ReceiptItemPhotos");

            migrationBuilder.DropTable(
                name: "ReceiptItems");

            migrationBuilder.DropIndex(
                name: "IX_ReceiptItemPhotos_ReceiptItemId",
                table: "ReceiptItemPhotos");

            migrationBuilder.DropColumn(
                name: "ReceiptItemId",
                table: "ReceiptItemPhotos");
        }
    }
}
