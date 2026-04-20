using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AlignCampaignPurchaseSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OrganizationId",
                table: "CampaignPurchases",
                type: "uuid",
                nullable: false,
                defaultValue: Guid.Empty);

            migrationBuilder.Sql("""
                UPDATE "CampaignPurchases" p
                SET "OrganizationId" = c."OrganizationId"
                FROM "Campaigns" c
                WHERE p."CampaignId" IS NOT NULL
                  AND p."CampaignId" = c."Id"
                  AND p."OrganizationId" = '00000000-0000-0000-0000-000000000000';
                """);

            migrationBuilder.CreateIndex(
                name: "IX_CampaignPurchases_OrganizationId",
                table: "CampaignPurchases",
                column: "OrganizationId");

            migrationBuilder.AddForeignKey(
                name: "FK_CampaignPurchases_Organizations_OrganizationId",
                table: "CampaignPurchases",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CampaignPurchases_Organizations_OrganizationId",
                table: "CampaignPurchases");

            migrationBuilder.DropIndex(
                name: "IX_CampaignPurchases_OrganizationId",
                table: "CampaignPurchases");

            migrationBuilder.DropColumn(
                name: "OrganizationId",
                table: "CampaignPurchases");
        }
    }
}
