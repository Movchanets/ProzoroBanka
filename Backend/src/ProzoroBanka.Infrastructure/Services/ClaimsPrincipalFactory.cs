using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.Infrastructure.Identity;

namespace ProzoroBanka.Infrastructure.Services;

public class ClaimsPrincipalFactory : UserClaimsPrincipalFactory<ApplicationUser, RoleEntity>
{
	private readonly ApplicationDbContext _dbContext;
	private readonly IFileStorage _fileStorage;

	public ClaimsPrincipalFactory(
		UserManager<ApplicationUser> userManager,
		RoleManager<RoleEntity> roleManager,
		IOptions<IdentityOptions> optionsAccessor,
		ApplicationDbContext dbContext,
		IFileStorage fileStorage)
		: base(userManager, roleManager, optionsAccessor)
	{
		_dbContext = dbContext;
		_fileStorage = fileStorage;
	}

	public override async Task<ClaimsPrincipal> CreateAsync(ApplicationUser user)
	{
		var principal = await base.CreateAsync(user);
		if (principal.Identity is not ClaimsIdentity identity)
			return principal;

		var domainUser = user.DomainUserId.HasValue
			? await _dbContext.DomainUsers.FindAsync([user.DomainUserId.Value])
			: null;

		if (domainUser is null)
			return principal;

		AddClaimIfMissing(identity, "domain_user_id", domainUser.Id.ToString());
		AddClaimIfMissing(identity, ClaimTypes.GivenName, domainUser.FirstName);
		AddClaimIfMissing(identity, ClaimTypes.Surname, domainUser.LastName);

		if (!string.IsNullOrWhiteSpace(domainUser.ProfilePhotoStorageKey))
		{
			AddClaimIfMissing(identity, "avatarUrl", _fileStorage.GetPublicUrl(domainUser.ProfilePhotoStorageKey));
		}

		return principal;
	}

	private static void AddClaimIfMissing(ClaimsIdentity identity, string claimType, string? value)
	{
		if (string.IsNullOrWhiteSpace(value))
			return;

		if (identity.HasClaim(claim => claim.Type == claimType))
			return;

		identity.AddClaim(new Claim(claimType, value));
	}
}