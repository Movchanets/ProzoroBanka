using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Identity;

namespace ProzoroBanka.Infrastructure.Data;

/// <summary>
/// Основний DbContext: об'єднує Identity + доменні сутності.
/// </summary>
public class ApplicationDbContext
	: IdentityDbContext<ApplicationUser, RoleEntity, Guid,
		Microsoft.AspNetCore.Identity.IdentityUserClaim<Guid>,
		ApplicationUserRole,
		Microsoft.AspNetCore.Identity.IdentityUserLogin<Guid>,
		ApplicationRoleClaim,
		Microsoft.AspNetCore.Identity.IdentityUserToken<Guid>>,
	  IApplicationDbContext
{
	public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
		: base(options) { }

	// ── Domain DbSets ──
	public DbSet<User> DomainUsers => Set<User>();
	public DbSet<Organization> Organizations => Set<Organization>();
	public DbSet<OrganizationMember> OrganizationMembers => Set<OrganizationMember>();
	public DbSet<Invitation> Invitations => Set<Invitation>();
	public DbSet<Receipt> Receipts => Set<Receipt>();
	public DbSet<MonobankTransaction> MonobankTransactions => Set<MonobankTransaction>();
	public DbSet<MatchResult> MatchResults => Set<MatchResult>();
	public DbSet<Campaign> Campaigns => Set<Campaign>();
	public DbSet<CampaignTransaction> CampaignTransactions => Set<CampaignTransaction>();

	// ── IApplicationDbContext explicit implementation ──
	DbSet<User> IApplicationDbContext.Users => DomainUsers;
	DbSet<Organization> IApplicationDbContext.Organizations => Organizations;
	DbSet<OrganizationMember> IApplicationDbContext.OrganizationMembers => OrganizationMembers;
	DbSet<Invitation> IApplicationDbContext.Invitations => Invitations;
	DbSet<Campaign> IApplicationDbContext.Campaigns => Campaigns;
	DbSet<CampaignTransaction> IApplicationDbContext.CampaignTransactions => CampaignTransactions;

	protected override void OnModelCreating(ModelBuilder builder)
	{
		base.OnModelCreating(builder);

		// ── Identity table renaming ──
		builder.Entity<ApplicationUser>(b =>
		{
			b.ToTable("AspNetUsers");
			b.HasIndex(u => u.DomainUserId).IsUnique();
			b.Property(u => u.RefreshToken).HasMaxLength(500);
			b.HasOne(u => u.DomainUser)
				.WithOne()
				.HasForeignKey<ApplicationUser>(u => u.DomainUserId)
				.IsRequired(false)
				.OnDelete(DeleteBehavior.Cascade);

			b.HasMany(u => u.UserRoles)
				.WithOne(ur => ur.User)
				.HasForeignKey(ur => ur.UserId)
				.IsRequired();
		});

		builder.Entity<RoleEntity>(b =>
		{
			b.ToTable("AspNetRoles");
			b.Property(r => r.Description).HasMaxLength(256);
			b.HasMany(r => r.UserRoles)
				.WithOne(ur => ur.Role)
				.HasForeignKey(ur => ur.RoleId)
				.IsRequired();

			b.HasMany(r => r.RoleClaims)
				.WithOne(rc => rc.Role)
				.HasForeignKey(rc => rc.RoleId)
				.IsRequired();
		});

		builder.Entity<ApplicationUserRole>(b =>
		{
			b.ToTable("AspNetUserRoles");
		});

		builder.Entity<ApplicationRoleClaim>(b =>
		{
			b.ToTable("AspNetRoleClaims");
		});

		// ── Domain entities ──
		builder.Entity<User>(b =>
		{
			b.ToTable("Users");
			b.HasKey(e => e.Id);
			b.HasIndex(e => e.IdentityUserId).IsUnique();
			b.Property(e => e.Email).HasMaxLength(256).IsRequired();
			b.Property(e => e.FirstName).HasMaxLength(100).IsRequired();
			b.Property(e => e.LastName).HasMaxLength(100).IsRequired();
			b.Property(e => e.MiddleName).HasMaxLength(100);
			b.Property(e => e.PhoneNumber).HasMaxLength(20);
			b.Property(e => e.ProfilePhotoStorageKey).HasMaxLength(512);
			b.Property(e => e.EncryptedMonobankToken).HasMaxLength(1024);
			b.HasQueryFilter(e => !e.IsDeleted);

			b.HasMany(e => e.Receipts)
				.WithOne(r => r.User)
				.HasForeignKey(r => r.UserId)
				.OnDelete(DeleteBehavior.Cascade);

			b.HasMany(e => e.MonobankTransactions)
				.WithOne(t => t.User)
				.HasForeignKey(t => t.UserId)
				.OnDelete(DeleteBehavior.Cascade);

			b.HasMany(e => e.OwnedOrganizations)
				.WithOne(o => o.OwnerUser)
				.HasForeignKey(o => o.OwnerUserId)
				.OnDelete(DeleteBehavior.Restrict);

			b.HasMany(e => e.OrganizationMemberships)
				.WithOne(m => m.User)
				.HasForeignKey(m => m.UserId)
				.OnDelete(DeleteBehavior.Cascade);
		});

		builder.Entity<Organization>(b =>
		{
			b.ToTable("Organizations");
			b.HasKey(e => e.Id);
			b.Property(e => e.Name).HasMaxLength(200).IsRequired();
			b.Property(e => e.Slug).HasMaxLength(200).IsRequired();
			b.HasIndex(e => e.Slug).IsUnique();
			b.Property(e => e.Description).HasMaxLength(2000);
			b.Property(e => e.LogoStorageKey).HasMaxLength(512);
			b.Property(e => e.Website).HasMaxLength(512);
			b.Property(e => e.ContactEmail).HasMaxLength(256);
			b.Property(e => e.Phone).HasMaxLength(32);
			b.HasQueryFilter(e => !e.IsDeleted);

			b.HasMany(e => e.Members)
				.WithOne(m => m.Organization)
				.HasForeignKey(m => m.OrganizationId)
				.OnDelete(DeleteBehavior.Cascade);

			b.HasMany(e => e.Invitations)
				.WithOne(i => i.Organization)
				.HasForeignKey(i => i.OrganizationId)
				.OnDelete(DeleteBehavior.Cascade);
		});

		builder.Entity<OrganizationMember>(b =>
		{
			b.ToTable("OrganizationMembers");
			b.HasKey(e => e.Id);
			b.HasIndex(e => new { e.OrganizationId, e.UserId }).IsUnique();
			b.Property(e => e.PermissionsFlags).HasConversion<int>();
			b.HasQueryFilter(e => !e.IsDeleted);
		});

		builder.Entity<Invitation>(b =>
		{
			b.ToTable("Invitations");
			b.HasKey(e => e.Id);
			b.Property(e => e.Token).HasMaxLength(200).IsRequired();
			b.HasIndex(e => e.Token).IsUnique();
			b.Property(e => e.Email).HasMaxLength(256);
			b.Property(e => e.DefaultRole).HasConversion<int>();
			b.Property(e => e.Status).HasConversion<int>();
			b.HasQueryFilter(e => !e.IsDeleted);

			b.HasOne(e => e.Inviter)
				.WithMany()
				.HasForeignKey(e => e.InviterId)
				.OnDelete(DeleteBehavior.Restrict);
		});

		builder.Entity<Receipt>(b =>
		{
			b.ToTable("Receipts");
			b.HasKey(e => e.Id);
			b.Property(e => e.StorageKey).HasMaxLength(512).IsRequired();
			b.Property(e => e.OriginalFileName).HasMaxLength(256).IsRequired();
			b.Property(e => e.MerchantName).HasMaxLength(256);
			b.Property(e => e.TotalAmount).HasPrecision(18, 2);
			b.HasQueryFilter(e => !e.IsDeleted);
		});

		builder.Entity<MonobankTransaction>(b =>
		{
			b.ToTable("MonobankTransactions");
			b.HasKey(e => e.Id);
			b.Property(e => e.ExternalId).HasMaxLength(128).IsRequired();
			b.HasIndex(e => e.ExternalId).IsUnique();
			b.Property(e => e.Description).HasMaxLength(512);
			b.Property(e => e.MerchantName).HasMaxLength(256);
			b.HasQueryFilter(e => !e.IsDeleted);
		});

		builder.Entity<MatchResult>(b =>
		{
			b.ToTable("MatchResults");
			b.HasKey(e => e.Id);

			b.HasOne(e => e.Receipt)
				.WithMany()
				.HasForeignKey(e => e.ReceiptId)
				.OnDelete(DeleteBehavior.Cascade);

			b.HasOne(e => e.MonobankTransaction)
				.WithMany()
				.HasForeignKey(e => e.MonobankTransactionId)
				.OnDelete(DeleteBehavior.Cascade);

			b.HasQueryFilter(e => !e.IsDeleted);
		});

		builder.Entity<Campaign>(b =>
		{
			b.ToTable("Campaigns");
			b.HasKey(e => e.Id);
			b.Property(e => e.Title).HasMaxLength(300).IsRequired();
			b.Property(e => e.Description).HasMaxLength(5000);
			b.Property(e => e.CoverImageStorageKey).HasMaxLength(512);
			b.Property(e => e.GoalAmount).HasPrecision(18, 2);
			b.Property(e => e.CurrentAmount).HasPrecision(18, 2);
			b.Property(e => e.Status).HasConversion<int>();
			b.Property(e => e.MonobankAccountId).HasMaxLength(128);
			b.Property(e => e.SendUrl).HasMaxLength(128);
			b.HasIndex(e => e.MonobankAccountId);
			b.HasQueryFilter(e => !e.IsDeleted);

			b.HasOne(e => e.Organization)
				.WithMany(o => o.Campaigns)
				.HasForeignKey(e => e.OrganizationId)
				.OnDelete(DeleteBehavior.Cascade);

			b.HasOne(e => e.CreatedBy)
				.WithMany()
				.HasForeignKey(e => e.CreatedByUserId)
				.OnDelete(DeleteBehavior.Restrict);

			b.HasMany(e => e.Transactions)
				.WithOne(t => t.Campaign)
				.HasForeignKey(t => t.CampaignId)
				.OnDelete(DeleteBehavior.Cascade);
		});

		builder.Entity<CampaignTransaction>(b =>
		{
			b.ToTable("CampaignTransactions");
			b.HasKey(e => e.Id);
			b.Property(e => e.ExternalTransactionId).HasMaxLength(128).IsRequired();
			b.HasIndex(e => new { e.CampaignId, e.ExternalTransactionId }).IsUnique();
			b.HasIndex(e => new { e.CampaignId, e.TransactionTimeUtc });
			b.Property(e => e.Amount).HasPrecision(18, 2);
			b.Property(e => e.Description).HasMaxLength(512);
			b.Property(e => e.Source).HasConversion<int>();
			b.Property(e => e.ProviderPayloadHash).HasMaxLength(128);
			b.HasQueryFilter(e => !e.IsDeleted);
		});
	}

	public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
	{
		var newOrganizations = ChangeTracker.Entries<Organization>()
			.Where(entry => entry.State == EntityState.Added)
			.Select(entry => entry.Entity)
			.ToList();

		foreach (var organization in newOrganizations)
		{
			var hasOwnerMembership = ChangeTracker.Entries<OrganizationMember>()
				.Any(entry =>
					entry.State != EntityState.Deleted &&
					entry.Entity.OrganizationId == organization.Id &&
					entry.Entity.UserId == organization.OwnerUserId);

			if (!hasOwnerMembership)
			{
				OrganizationMembers.Add(new OrganizationMember
				{
					OrganizationId = organization.Id,
					UserId = organization.OwnerUserId,
					Role = OrganizationRole.Owner,
					PermissionsFlags = OrganizationPermissions.All,
					JoinedAt = DateTime.UtcNow
				});
			}
		}

		foreach (var entry in ChangeTracker.Entries<BaseEntity>())
		{
			switch (entry.State)
			{
				case EntityState.Added:
					entry.Entity.CreatedAt = DateTime.UtcNow;
					break;
				case EntityState.Modified:
					entry.Entity.UpdatedAt = DateTime.UtcNow;
					break;
			}
		}

		return base.SaveChangesAsync(cancellationToken);
	}
}
