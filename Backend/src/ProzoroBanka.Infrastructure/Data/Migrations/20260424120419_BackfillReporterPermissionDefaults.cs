using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProzoroBanka.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class BackfillReporterPermissionDefaults : Migration
    {
      private const int OwnerRole = 0;
        private const int AdminRole = 1;
        private const int ReporterRole = 2;
      private const int LegacyAllPermissions = 127;
        private const int ReporterDefaultPermissions = 8584;
        private const int AllPermissions = 16383;

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
    			migrationBuilder.Sql($"""
    UPDATE "OrganizationMembers"
    SET "PermissionsFlags" = {ReporterDefaultPermissions}
    WHERE "Role" = {ReporterRole}
      AND "PermissionsFlags" = 0
      AND NOT "IsDeleted";
    """);

    			migrationBuilder.Sql($"""
    UPDATE "OrganizationMembers"
    SET "PermissionsFlags" = {AllPermissions}
      WHERE "Role" IN ({OwnerRole}, {AdminRole})
        AND "PermissionsFlags" IN (0, {LegacyAllPermissions})
      AND NOT "IsDeleted";
    """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
    			migrationBuilder.Sql($"""
    UPDATE "OrganizationMembers"
    SET "PermissionsFlags" = 0
    WHERE "Role" = {ReporterRole}
      AND "PermissionsFlags" = {ReporterDefaultPermissions}
      AND NOT "IsDeleted";
    """);

    			migrationBuilder.Sql($"""
    UPDATE "OrganizationMembers"
      SET "PermissionsFlags" = {LegacyAllPermissions}
      WHERE "Role" IN ({OwnerRole}, {AdminRole})
        AND "PermissionsFlags" = {AllPermissions}
      AND NOT "IsDeleted";
    """);
        }
    }
}
