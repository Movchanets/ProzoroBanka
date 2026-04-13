using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCampaignCategoriesAndLocalizedTitles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Title",
                table: "Campaigns",
                newName: "TitleUk");

            migrationBuilder.AddColumn<string>(
                name: "TitleEn",
                table: "Campaigns",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "CampaignCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NameUk = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    NameEn = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Slug = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CampaignCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CampaignCategoryMappings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CampaignId = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CampaignCategoryMappings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CampaignCategoryMappings_CampaignCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "CampaignCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CampaignCategoryMappings_Campaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "Campaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CampaignCategories_Slug",
                table: "CampaignCategories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CampaignCategories_SortOrder",
                table: "CampaignCategories",
                column: "SortOrder");

            migrationBuilder.CreateIndex(
                name: "IX_CampaignCategoryMappings_CampaignId_CategoryId",
                table: "CampaignCategoryMappings",
                columns: new[] { "CampaignId", "CategoryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CampaignCategoryMappings_CategoryId",
                table: "CampaignCategoryMappings",
                column: "CategoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CampaignCategoryMappings");

            migrationBuilder.DropTable(
                name: "CampaignCategories");

            migrationBuilder.DropColumn(
                name: "TitleEn",
                table: "Campaigns");

            migrationBuilder.RenameColumn(
                name: "TitleUk",
                table: "Campaigns",
                newName: "Title");
        }
    }
}
