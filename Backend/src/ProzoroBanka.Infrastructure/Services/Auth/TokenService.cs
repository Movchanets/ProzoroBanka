using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
using ProzoroBanka.Infrastructure.Identity;

namespace ProzoroBanka.Infrastructure.Services.Auth;

public class TokenService : ITokenService
{
	private const string PermissionClaimType = "permission";
	private const string OrganizationPermissionsClaimType = "org_permissions";
	private const string UsersSelfPermission = "users.self";
	private const string InvitationAcceptPermission = "invitation.accept";

	private readonly IConfiguration _configuration;
	private readonly ApplicationDbContext _dbContext;
	private readonly IFileStorage _fileStorage;
	private readonly IAuthSessionStore _authSessionStore;
	private readonly ILogger<TokenService> _logger;

	public TokenService(
		IConfiguration configuration,
		ApplicationDbContext dbContext,
		IFileStorage fileStorage,
		IAuthSessionStore authSessionStore,
		ILogger<TokenService> logger)
	{
		_configuration = configuration;
		_dbContext = dbContext;
		_fileStorage = fileStorage;
		_authSessionStore = authSessionStore;
		_logger = logger;
	}

	public async Task<TokenResponse> GenerateTokensAsync(
		Guid applicationUserId,
		string email,
		IList<string> roles,
		IList<string> permissions,
		string? sessionId = null,
		CancellationToken ct = default)
	{
		var jwtSettings = _configuration.GetSection("Jwt");
		var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
		var refreshKey = jwtSettings["RefreshKey"] ?? jwtSettings["Key"]!;
		var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
		sessionId ??= Guid.NewGuid().ToString("N");

		var claims = new List<Claim>
		{
			new(ClaimTypes.NameIdentifier, applicationUserId.ToString()),
			new(ClaimTypes.Email, email),
			new(JwtRegisteredClaimNames.Sid, sessionId),
			new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
		};

		var appUser = await _dbContext.Set<ApplicationUser>()
			.Include(user => user.DomainUser)
			.FirstOrDefaultAsync(u => u.Id == applicationUserId, ct);

		AddDomainClaims(claims, appUser?.DomainUser);
		await AddOrganizationPermissionsClaimAsync(claims, appUser?.DomainUser?.Id, ct);

		foreach (var role in roles)
			claims.Add(new Claim(ClaimTypes.Role, role));

		var effectivePermissions = new HashSet<string>(permissions, StringComparer.OrdinalIgnoreCase)
		{
			UsersSelfPermission,
			InvitationAcceptPermission
		};

		foreach (var permission in effectivePermissions)
			claims.Add(new Claim(PermissionClaimType, permission));

		var accessTokenExpiry = DateTime.UtcNow.AddMinutes(
			int.Parse(jwtSettings["AccessTokenExpirationMinutes"] ?? "30"));

		var token = new JwtSecurityToken(
			issuer: jwtSettings["Issuer"],
			audience: jwtSettings["Audience"],
			claims: claims,
			expires: accessTokenExpiry,
			signingCredentials: credentials);

		var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
		var refreshToken = GenerateRefreshToken(refreshKey);
		var refreshTokenExpiry = DateTime.UtcNow.AddDays(
			int.Parse(jwtSettings["RefreshTokenExpirationDays"] ?? "7"));

		await _authSessionStore.StoreSessionAsync(
			applicationUserId,
			sessionId,
			HashRefreshToken(refreshToken, refreshKey),
			refreshTokenExpiry,
			ct);

		_logger.LogInformation("Tokens generated for user {UserId}, sid {SessionId}", applicationUserId, sessionId);
		return new TokenResponse(accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry);
	}

	public async Task<TokenResponse> GenerateTokensForUserAsync(Guid applicationUserId, CancellationToken ct = default)
	{
		var user = await _dbContext.Set<ApplicationUser>()
			.Include(applicationUser => applicationUser.DomainUser)
			.Include(applicationUser => applicationUser.UserRoles)
				.ThenInclude(userRole => userRole.Role)
					.ThenInclude(role => role.RoleClaims)
			.FirstOrDefaultAsync(applicationUser => applicationUser.Id == applicationUserId, ct)
			?? throw new SecurityTokenException("User not found");

		var roles = user.UserRoles
			.Select(userRole => userRole.Role.Name)
			.Where(roleName => !string.IsNullOrWhiteSpace(roleName))
			.Select(roleName => roleName!)
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.ToList();

		var permissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
		foreach (var role in user.UserRoles.Select(userRole => userRole.Role))
		{
			foreach (var claim in role.RoleClaims)
			{
				if (claim.ClaimType == PermissionClaimType && !string.IsNullOrWhiteSpace(claim.ClaimValue))
					permissions.Add(claim.ClaimValue);
			}

			var predefinedRole = ApplicationRoleDefinitions.FindByName(role.Name ?? string.Empty);
			if (predefinedRole is null)
				continue;

			foreach (var permission in predefinedRole.Permissions)
				permissions.Add(permission);
		}

		return await GenerateTokensAsync(
			user.Id,
			user.Email ?? string.Empty,
			roles,
			permissions.ToList(),
			sessionId: null,
			ct);
	}

	public async Task<TokenResponse> RefreshTokensAsync(string accessToken, string refreshToken, CancellationToken ct = default)
	{
		var jwtSettings = _configuration.GetSection("Jwt");
		var refreshKey = jwtSettings["RefreshKey"] ?? jwtSettings["Key"]!;
		var principal = GetPrincipalFromExpiredToken(accessToken);

		var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
			?? throw new SecurityTokenException("Invalid access token: missing user id");

		if (!Guid.TryParse(userIdClaim, out var userId))
			throw new SecurityTokenException("Invalid access token: malformed user id");

		var sessionId = principal.FindFirst(JwtRegisteredClaimNames.Sid)?.Value
			?? principal.FindFirst("sid")?.Value
			?? throw new SecurityTokenException("Invalid access token: missing sid");

		var session = await _authSessionStore.GetSessionAsync(userId, sessionId, ct);
		if (session is null || session.RefreshTokenExpiryUtc <= DateTime.UtcNow)
			throw new SecurityTokenException("Invalid or expired refresh token");

		if (!string.Equals(session.RefreshTokenHash, HashRefreshToken(refreshToken, refreshKey), StringComparison.Ordinal))
			throw new SecurityTokenException("Invalid or expired refresh token");

		var user = await _dbContext.Set<ApplicationUser>()
			.Include(u => u.UserRoles)
				.ThenInclude(userRole => userRole.Role)
					.ThenInclude(role => role.RoleClaims)
			.FirstOrDefaultAsync(u => u.Id == userId, ct)
			?? throw new SecurityTokenException("User not found");

		var roles = user.UserRoles
			.Select(userRole => userRole.Role.Name)
			.Where(roleName => !string.IsNullOrWhiteSpace(roleName))
			.Select(roleName => roleName!)
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.ToList();

		var permissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
		foreach (var role in user.UserRoles.Select(userRole => userRole.Role))
		{
			foreach (var claim in role.RoleClaims)
			{
				if (claim.ClaimType == PermissionClaimType && !string.IsNullOrWhiteSpace(claim.ClaimValue))
					permissions.Add(claim.ClaimValue);
			}

			var predefinedRole = ApplicationRoleDefinitions.FindByName(role.Name ?? string.Empty);
			if (predefinedRole is null)
				continue;

			foreach (var permission in predefinedRole.Permissions)
				permissions.Add(permission);
		}

		var email = user.Email ?? principal.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;
		return await GenerateTokensAsync(userId, email, roles, permissions.ToList(), sessionId, ct);
	}

	public async Task RevokeSessionAsync(Guid applicationUserId, string sessionId, CancellationToken ct = default)
	{
		await _authSessionStore.RemoveSessionAsync(applicationUserId, sessionId, ct);
		_logger.LogInformation("Session revoked for user {UserId}, sid {SessionId}", applicationUserId, sessionId);
	}

	private ClaimsPrincipal GetPrincipalFromExpiredToken(string token)
	{
		var jwtSettings = _configuration.GetSection("Jwt");
		var validationParameters = new TokenValidationParameters
		{
			ValidateIssuer = true,
			ValidateAudience = true,
			ValidIssuer = jwtSettings["Issuer"],
			ValidAudience = jwtSettings["Audience"],
			ValidateIssuerSigningKey = true,
			IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!)),
			ValidateLifetime = false,
		};

		var handler = new JwtSecurityTokenHandler();
		var principal = handler.ValidateToken(token, validationParameters, out var securityToken);

		if (securityToken is not JwtSecurityToken jwtSecurityToken
			|| !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
		{
			throw new SecurityTokenException("Invalid token");
		}

		return principal;
	}

	private static string GenerateRefreshToken(string refreshKey)
	{
		var randomNumber = new byte[64];
		using var rng = RandomNumberGenerator.Create();
		rng.GetBytes(randomNumber);

		var payload = Convert.ToBase64String(randomNumber);
		var signature = HashRefreshToken(payload, refreshKey);
		return $"{payload}.{signature}";
	}

	private static string HashRefreshToken(string refreshToken, string refreshKey)
	{
		using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(refreshKey));
		var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(refreshToken));
		return Convert.ToBase64String(hash);
	}

	private void AddDomainClaims(ICollection<Claim> claims, User? domainUser)
	{
		if (domainUser is null)
			return;

		claims.Add(new Claim("domain_user_id", domainUser.Id.ToString()));

		if (!string.IsNullOrWhiteSpace(domainUser.FirstName))
			claims.Add(new Claim(ClaimTypes.GivenName, domainUser.FirstName));

		if (!string.IsNullOrWhiteSpace(domainUser.LastName))
			claims.Add(new Claim(ClaimTypes.Surname, domainUser.LastName));

		if (!string.IsNullOrWhiteSpace(domainUser.ProfilePhotoStorageKey))
			claims.Add(new Claim("avatarUrl", _fileStorage.GetPublicUrl(domainUser.ProfilePhotoStorageKey)));
	}

	private async Task AddOrganizationPermissionsClaimAsync(ICollection<Claim> claims, Guid? domainUserId, CancellationToken ct)
	{
		if (domainUserId is null)
			return;

		var organizationPermissions = await _dbContext.OrganizationMembers
			.AsNoTracking()
			.Where(member => member.UserId == domainUserId.Value && !member.IsDeleted && !member.Organization.IsDeleted)
			.Select(member => new
			{
				member.OrganizationId,
				member.Role,
				member.PermissionsFlags,
				member.Organization.IsBlocked
			})
			.ToListAsync(ct);

		var claimPayload = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
		foreach (var membership in organizationPermissions)
		{
			var permissionsMask = membership.IsBlocked
				? OrganizationPermissions.None
				: membership.Role == OrganizationRole.Owner
					? OrganizationPermissions.All
					: OrganizationRolePermissions.GetEffectivePermissions(
						membership.Role,
						membership.PermissionsFlags);

			claimPayload[$"org_{membership.OrganizationId:D}"] = (int)permissionsMask;
		}

		claims.Add(new Claim(OrganizationPermissionsClaimType, JsonSerializer.Serialize(claimPayload)));
	}
}
