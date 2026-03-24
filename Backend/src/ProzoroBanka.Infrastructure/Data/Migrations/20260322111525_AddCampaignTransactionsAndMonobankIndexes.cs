using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignTransactionsAndMonobankIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CampaignTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: false),
                    ExternalTransactionId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Description = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    TransactionTimeUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    ProviderPayloadHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CampaignTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CampaignTransactions_Campaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "Campaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Campaigns_MonobankAccountId",
                table: "Campaigns",
                column: "MonobankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignTransactions_CampaignId_ExternalTransactionId",
                table: "CampaignTransactions",
                columns: new[] { "CampaignId", "ExternalTransactionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CampaignTransactions_CampaignId_TransactionTimeUtc",
                table: "CampaignTransactions",
                columns: new[] { "CampaignId", "TransactionTimeUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CampaignTransactions");

            migrationBuilder.DropIndex(
                name: "IX_Campaigns_MonobankAccountId",
                table: "Campaigns");
        }
    }
}
