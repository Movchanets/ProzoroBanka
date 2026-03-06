using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Contracts.Email;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Infrastructure.Identity;

namespace ProzoroBanka.Infrastructure.Services;

/// <summary>
/// Імплементація IIdentityService на базі ASP.NET Core Identity.
/// </summary>
public class UserService : IUserService
{
	private readonly UserManager<ApplicationUser> _userManager;
	private readonly SignInManager<ApplicationUser> _signInManager;
	private readonly RoleManager<RoleEntity> _roleManager;
	private readonly ITokenService _tokenService;
	private readonly IEmailNotificationService _emailNotificationService;
	private readonly IFileStorage _fileStorage;
	private readonly IApplicationDbContext _dbContext;
	private readonly ILogger<UserService> _logger;

	public UserService(
		UserManager<ApplicationUser> userManager,
		SignInManager<ApplicationUser> signInManager,
		RoleManager<RoleEntity> roleManager,
		ITokenService tokenService,
		IEmailNotificationService emailNotificationService,
		IFileStorage fileStorage,
		IApplicationDbContext dbContext,
		ILogger<UserService> logger)
	{
		_userManager = userManager;
		_signInManager = signInManager;
		_roleManager = roleManager;
		_tokenService = tokenService;
		_emailNotificationService = emailNotificationService;
		_fileStorage = fileStorage;
		_dbContext = dbContext;
		_logger = logger;
	}

	public async Task<ServiceResponse<AuthResult>> RegisterAsync(
		string email, string password, string firstName, string lastName, CancellationToken ct)
	{
		// Перевірка унікальності email
		var existingUser = await _userManager.FindByEmailAsync(email);
		if (existingUser is not null)
			return ServiceResponse<AuthResult>.Failure("Користувач з таким email вже існує.");

		// Створення доменного User
		var domainUser = new User
		{
			Email = email,
			FirstName = firstName,
			LastName = lastName,
			IsActive = true,
		};
		_dbContext.Users.Add(domainUser);
		await _dbContext.SaveChangesAsync(ct);

		// Створення Identity User
		var identityUser = new ApplicationUser
		{
			UserName = email,
			Email = email,
			DomainUserId = domainUser.Id,
		};

		var result = await _userManager.CreateAsync(identityUser, password);
		if (!result.Succeeded)
		{
			_dbContext.Users.Remove(domainUser);
			await _dbContext.SaveChangesAsync(ct);
			var errors = string.Join("; ", result.Errors.Select(e => e.Description));
			return ServiceResponse<AuthResult>.Failure(errors);
		}

		domainUser.IdentityUserId = identityUser.Id;
		await _dbContext.SaveChangesAsync(ct);

		// Роль за замовчуванням
		var volunteerRoleResult = await EnsureRoleDefinitionExistsAsync(ApplicationRoleDefinitions.Volunteer);
		if (!volunteerRoleResult.IsSuccess)
			return ServiceResponse<AuthResult>.Failure(volunteerRoleResult.Message);

		var addToRoleResult = await _userManager.AddToRoleAsync(identityUser, ApplicationRoles.Volunteer);
		if (!addToRoleResult.Succeeded)
			return ServiceResponse<AuthResult>.Failure(string.Join("; ", addToRoleResult.Errors.Select(e => e.Description)));

		// Токени
		var roles = await _userManager.GetRolesAsync(identityUser);
		var permissions = await GetUserPermissionsAsync(identityUser);
		var tokens = await _tokenService.GenerateTokensAsync(identityUser.Id, email, roles, permissions, ct);

		_logger.LogInformation("User registered: {Email}", email);

		return ServiceResponse<AuthResult>.Success(new AuthResult(
			tokens.AccessToken,
			tokens.RefreshToken,
			tokens.AccessTokenExpiry,
			domainUser.Id,
			domainUser.Email,
			domainUser.FirstName,
			domainUser.LastName,
			null));
	}

	public async Task<ServiceResponse<AuthResult>> LoginAsync(
		string email, string password, CancellationToken ct)
	{
		var user = await _userManager.FindByEmailAsync(email);
		if (user is null)
			return ServiceResponse<AuthResult>.Failure("Невірний email або пароль.");

		var domainUser = await FindDomainUserAsync(user, ct);

		if (domainUser is not null && !domainUser.IsActive)
			return ServiceResponse<AuthResult>.Failure("Обліковий запис деактивовано.");

		var signInResult = await _signInManager.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true);
		if (!signInResult.Succeeded)
		{
			if (signInResult.IsLockedOut)
				return ServiceResponse<AuthResult>.Failure("Обліковий запис заблоковано. Спробуйте пізніше.");
			return ServiceResponse<AuthResult>.Failure("Невірний email або пароль.");
		}

		var roles = await _userManager.GetRolesAsync(user);
		var permissions = await GetUserPermissionsAsync(user);
		var tokens = await _tokenService.GenerateTokensAsync(user.Id, user.Email!, roles, permissions, ct);

		_logger.LogInformation("User logged in: {Email}", email);

		return ServiceResponse<AuthResult>.Success(new AuthResult(
			tokens.AccessToken,
			tokens.RefreshToken,
			tokens.AccessTokenExpiry,
			domainUser?.Id ?? Guid.Empty,
			user.Email!,
			domainUser?.FirstName ?? "",
			domainUser?.LastName ?? "",
			BuildProfilePhotoUrl(domainUser?.ProfilePhotoStorageKey)));
	}

	public async Task<ServiceResponse<AuthResult>> GoogleLoginAsync(string idToken, CancellationToken ct)
	{
		// TODO: Імплементувати Google OAuth token validation
		_logger.LogWarning("Google login not yet implemented");
		return ServiceResponse<AuthResult>.Failure("Google login ще не реалізовано.");
	}

	public async Task<ServiceResponse<TokenResponse>> RefreshTokenAsync(
		string accessToken, string refreshToken, CancellationToken ct)
	{
		try
		{
			var tokens = await _tokenService.RefreshTokensAsync(accessToken, refreshToken, ct);
			return ServiceResponse<TokenResponse>.Success(tokens);
		}
		catch (Exception ex)
		{
			_logger.LogWarning(ex, "Token refresh failed");
			return ServiceResponse<TokenResponse>.Failure("Невалідний або прострочений refresh token.");
		}
	}

	public async Task<ServiceResponse> LogoutAsync(Guid applicationUserId, CancellationToken ct)
	{
		await _tokenService.RevokeRefreshTokenAsync(applicationUserId, ct);
		return ServiceResponse.Success();
	}

	public async Task<ServiceResponse<UserProfile>> GetProfileAsync(Guid applicationUserId, CancellationToken ct)
	{
		var identityUser = await _userManager.FindByIdAsync(applicationUserId.ToString());
		if (identityUser is null)
			return ServiceResponse<UserProfile>.Failure("Користувача не знайдено.");

		var domainUser = await FindDomainUserAsync(identityUser, ct);

		var roles = await _userManager.GetRolesAsync(identityUser);

		return ServiceResponse<UserProfile>.Success(new UserProfile(
			domainUser?.Id ?? Guid.Empty,
			identityUser.Email!,
			domainUser?.FirstName ?? "",
			domainUser?.LastName ?? "",
			BuildProfilePhotoUrl(domainUser?.ProfilePhotoStorageKey),
			roles));
	}

	public async Task<ServiceResponse> CreateRoleAsync(string roleName, string? description, CancellationToken ct)
	{
		if (await _roleManager.RoleExistsAsync(roleName))
			return ServiceResponse.Failure($"Роль '{roleName}' вже існує.");

		var result = await _roleManager.CreateAsync(new RoleEntity
		{
			Name = roleName,
			Description = description,
		});

		return result.Succeeded
			? ServiceResponse.Success($"Роль '{roleName}' створено.")
			: ServiceResponse.Failure(string.Join("; ", result.Errors.Select(e => e.Description)));
	}

	public async Task<ServiceResponse> AssignRolesAsync(Guid applicationUserId, IEnumerable<string> roles, CancellationToken ct)
	{
		var user = await _userManager.FindByIdAsync(applicationUserId.ToString());
		if (user is null)
			return ServiceResponse.Failure("Користувача не знайдено.");

		var requestedRoles = roles
			.Where(role => !string.IsNullOrWhiteSpace(role))
			.Select(role => role.Trim())
			.Distinct(StringComparer.OrdinalIgnoreCase)
			.ToList();

		if (requestedRoles.Count == 0)
			return ServiceResponse.Failure("Потрібно вказати хоча б одну роль.");

		var invalidRoles = new List<string>();
		foreach (var role in requestedRoles)
		{
			if (!await _roleManager.RoleExistsAsync(role))
				invalidRoles.Add(role);
		}

		if (invalidRoles.Count > 0)
			return ServiceResponse.Failure($"Невідомі ролі: {string.Join(", ", invalidRoles)}.");

		var currentRoles = await _userManager.GetRolesAsync(user);
		await _userManager.RemoveFromRolesAsync(user, currentRoles);

		var result = await _userManager.AddToRolesAsync(user, requestedRoles);
		return result.Succeeded
			? ServiceResponse.Success("Ролі призначено.")
			: ServiceResponse.Failure(string.Join("; ", result.Errors.Select(e => e.Description)));
	}

	public async Task<ServiceResponse> SetLockoutAsync(Guid applicationUserId, bool locked, CancellationToken ct)
	{
		var user = await _userManager.FindByIdAsync(applicationUserId.ToString());
		if (user is null)
			return ServiceResponse.Failure("Користувача не знайдено.");

		var lockoutEnd = locked ? DateTimeOffset.MaxValue : (DateTimeOffset?)null;
		var result = await _userManager.SetLockoutEndDateAsync(user, lockoutEnd);

		return result.Succeeded
			? ServiceResponse.Success(locked ? "Користувача заблоковано." : "Користувача розблоковано.")
			: ServiceResponse.Failure(string.Join("; ", result.Errors.Select(e => e.Description)));
	}

	public async Task<ServiceResponse> DeleteUserAsync(Guid applicationUserId, CancellationToken ct)
	{
		var user = await _userManager.FindByIdAsync(applicationUserId.ToString());
		if (user is null)
			return ServiceResponse.Failure("Користувача не знайдено.");

		// Видалення доменного User
		var domainUser = await FindDomainUserAsync(user, ct);
		if (domainUser is not null)
		{
			_dbContext.Users.Remove(domainUser);
			await _dbContext.SaveChangesAsync(ct);
		}

		var result = await _userManager.DeleteAsync(user);
		return result.Succeeded
			? ServiceResponse.Success("Користувача видалено.")
			: ServiceResponse.Failure(string.Join("; ", result.Errors.Select(e => e.Description)));
	}

	public async Task<ServiceResponse> ForgotPasswordAsync(string email, string origin, CancellationToken ct)
	{
		var user = await _userManager.FindByEmailAsync(email);
		if (user is null)
			return ServiceResponse.Success("Якщо email існує, інструкції надіслано.");

		var token = await _userManager.GeneratePasswordResetTokenAsync(user);
		var callbackUrl = BuildPasswordResetUrl(origin, email, token);

		await _emailNotificationService.SendEmailAsync(
			new PasswordResetEmailCommand(
				email,
				"Скидання пароля ProzoroBanka",
				BuildPasswordResetBody(callbackUrl),
				true,
				CorrelationId: $"password-reset:{user.Id}"),
			ct);

		_logger.LogInformation("Password reset instructions queued for {Email}", email);
		return ServiceResponse.Success("Якщо email існує, інструкції надіслано.");
	}

	public async Task<ServiceResponse> ResetPasswordAsync(string email, string token, string newPassword, CancellationToken ct)
	{
		var user = await _userManager.FindByEmailAsync(email);
		if (user is null)
			return ServiceResponse.Failure("Невалідний токен або email.");

		var result = await _userManager.ResetPasswordAsync(user, token, newPassword);
		if (!result.Succeeded)
			return ServiceResponse.Failure(string.Join("; ", result.Errors.Select(e => e.Description)));

		_logger.LogInformation("Password reset completed for {Email}", email);
		return ServiceResponse.Success("Пароль успішно змінено.");
	}

	// ── Helpers ──

	private static string BuildPasswordResetUrl(string origin, string email, string token)
	{
		var normalizedOrigin = origin.TrimEnd('/');
		return $"{normalizedOrigin}/reset-password?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
	}

	private static string BuildPasswordResetBody(string callbackUrl)
	{
		return $"""
			<p>Ви отримали цей лист, тому що надійшов запит на скидання пароля.</p>
			<p><a href=\"{callbackUrl}\">Скинути пароль</a></p>
			<p>Якщо ви не надсилали цей запит, просто проігноруйте лист.</p>
			""";
	}

	private string? BuildProfilePhotoUrl(string? storageKey)
	{
		if (string.IsNullOrWhiteSpace(storageKey))
			return null;

		return _fileStorage.GetPublicUrl(storageKey);
	}

	private async Task<ServiceResponse> EnsureRoleDefinitionExistsAsync(ApplicationRoleDefinition roleDefinition)
	{
		var role = await _roleManager.FindByNameAsync(roleDefinition.Name);
		if (role is null)
		{
			var createResult = await _roleManager.CreateAsync(new RoleEntity
			{
				Name = roleDefinition.Name,
				Description = roleDefinition.Description
			});

			if (!createResult.Succeeded)
			{
				return ServiceResponse.Failure(string.Join("; ", createResult.Errors.Select(e => e.Description)));
			}

			role = await _roleManager.FindByNameAsync(roleDefinition.Name);
		}

		if (role is null)
			return ServiceResponse.Failure($"Не вдалося завантажити роль '{roleDefinition.Name}'.");

		if (!string.Equals(role.Description, roleDefinition.Description, StringComparison.Ordinal))
		{
			role.Description = roleDefinition.Description;
			await _roleManager.UpdateAsync(role);
		}

		var existingClaims = await _roleManager.GetClaimsAsync(role);
		foreach (var permission in roleDefinition.Permissions)
		{
			if (existingClaims.Any(claim => claim.Type == "permission" && claim.Value == permission))
				continue;

			await _roleManager.AddClaimAsync(role, new System.Security.Claims.Claim("permission", permission));
		}

		return ServiceResponse.Success();
	}

	private async Task<IList<string>> GetUserPermissionsAsync(ApplicationUser user)
	{
		var roles = await _userManager.GetRolesAsync(user);
		var permissions = new List<string>();

		foreach (var roleName in roles)
		{
			var role = await _roleManager.FindByNameAsync(roleName);
			if (role is null) continue;

			var roleClaims = await _roleManager.GetClaimsAsync(role);
			permissions.AddRange(
				roleClaims
					.Where(c => c.Type == "permission")
					.Select(c => c.Value));
		}

		return permissions.Distinct().ToList();
	}

	private async Task<User?> FindDomainUserAsync(ApplicationUser identityUser, CancellationToken ct)
	{
		if (identityUser.DomainUserId.HasValue)
		{
			var domainUser = await _dbContext.Users.FindAsync([identityUser.DomainUserId.Value], ct);
			if (domainUser is not null)
			{
				if (domainUser.IdentityUserId != identityUser.Id)
				{
					domainUser.IdentityUserId = identityUser.Id;
					await _dbContext.SaveChangesAsync(ct);
				}

				return domainUser;
			}
		}

		var fallbackUser = await _dbContext.Users.FirstOrDefaultAsync(user => user.IdentityUserId == identityUser.Id, ct);
		if (fallbackUser is not null && identityUser.DomainUserId != fallbackUser.Id)
		{
			identityUser.DomainUserId = fallbackUser.Id;
			await _userManager.UpdateAsync(identityUser);
		}

		return fallbackUser;
	}

	private sealed record PasswordResetEmailCommand(
		string To,
		string Subject,
		string Body,
		bool IsHtml,
		string? From = null,
		IEnumerable<string>? Cc = null,
		IEnumerable<string>? Bcc = null,
		IEnumerable<IEmailAttachment>? Attachments = null,
		string? CorrelationId = null) : ISendEmailCommand
	{
		public Guid MessageId { get; } = Guid.NewGuid();
		public DateTime RequestedAt { get; } = DateTime.UtcNow;
	}
}
