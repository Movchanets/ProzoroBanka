using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProzoroBanka.Application.Contracts.Email;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Application.Common.Models;
using ProzoroBanka.Domain.Entities;
using ProzoroBanka.Domain.Enums;
using ProzoroBanka.Infrastructure.Data;
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
    private readonly IGoogleTokenValidator _googleTokenValidator;
    private readonly ILogger<UserService> _logger;

    public UserService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        RoleManager<RoleEntity> roleManager,
        ITokenService tokenService,
        IEmailNotificationService emailNotificationService,
        IFileStorage fileStorage,
        IApplicationDbContext dbContext,
        IGoogleTokenValidator googleTokenValidator,
        ILogger<UserService> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _roleManager = roleManager;
        _tokenService = tokenService;
        _emailNotificationService = emailNotificationService;
        _fileStorage = fileStorage;
        _dbContext = dbContext;
        _googleTokenValidator = googleTokenValidator;
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
        var tokens = await _tokenService.GenerateTokensAsync(identityUser.Id, email, roles, permissions, ct: ct);

        _logger.LogInformation("User registered: {Email}", email);

        return ServiceResponse<AuthResult>.Success(new AuthResult(
            tokens.AccessToken,
            tokens.RefreshToken,
            tokens.AccessTokenExpiry,
            tokens.RefreshTokenExpiry,
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
        var tokens = await _tokenService.GenerateTokensAsync(user.Id, user.Email!, roles, permissions, ct: ct);

        _logger.LogInformation("User logged in: {Email}", email);

        return ServiceResponse<AuthResult>.Success(new AuthResult(
            tokens.AccessToken,
            tokens.RefreshToken,
            tokens.AccessTokenExpiry,
            tokens.RefreshTokenExpiry,
            domainUser?.Id ?? Guid.Empty,
            user.Email!,
            domainUser?.FirstName ?? "",
            domainUser?.LastName ?? "",
            BuildProfilePhotoUrl(domainUser?.ProfilePhotoStorageKey)));
    }

    public async Task<ServiceResponse<AuthResult>> GoogleLoginAsync(string idToken, CancellationToken ct)
    {
        var googleValidationResult = await _googleTokenValidator.ValidateAsync(idToken, ct);
        if (!googleValidationResult.IsSuccess)
            return ServiceResponse<AuthResult>.Failure(googleValidationResult.Message);

        var payload = googleValidationResult.Payload!;
        var email = payload.Email.Trim();
        var firstName = NormalizeGoogleName(payload.GivenName, payload.FullName, email);
        var lastName = NormalizeGoogleLastName(payload.FamilyName);

        var identityUser = await _userManager.FindByEmailAsync(email);
        var domainUser = identityUser is not null
            ? await FindDomainUserAsync(identityUser, ct)
            : null;

        if (identityUser is null)
        {
            domainUser = new User
            {
                Email = email,
                FirstName = firstName,
                LastName = lastName,
                IsActive = true,
            };

            _dbContext.Users.Add(domainUser);
            await _dbContext.SaveChangesAsync(ct);

            identityUser = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DomainUserId = domainUser.Id,
            };

            var createResult = await _userManager.CreateAsync(identityUser);
            if (!createResult.Succeeded)
            {
                _dbContext.Users.Remove(domainUser);
                await _dbContext.SaveChangesAsync(ct);
                return ServiceResponse<AuthResult>.Failure(string.Join("; ", createResult.Errors.Select(e => e.Description)));
            }

            domainUser.IdentityUserId = identityUser.Id;
            await _dbContext.SaveChangesAsync(ct);
        }
        else
        {
            identityUser.EmailConfirmed = true;
            await _userManager.UpdateAsync(identityUser);

            if (domainUser is null)
            {
                domainUser = new User
                {
                    Email = email,
                    FirstName = firstName,
                    LastName = lastName,
                    IdentityUserId = identityUser.Id,
                    IsActive = true,
                };

                _dbContext.Users.Add(domainUser);
                await _dbContext.SaveChangesAsync(ct);

                identityUser.DomainUserId = domainUser.Id;
                await _userManager.UpdateAsync(identityUser);
            }
            else
            {
                var hasChanges = false;

                if (string.IsNullOrWhiteSpace(domainUser.FirstName))
                {
                    domainUser.FirstName = firstName;
                    hasChanges = true;
                }

                if (string.IsNullOrWhiteSpace(domainUser.LastName) && !string.IsNullOrWhiteSpace(lastName))
                {
                    domainUser.LastName = lastName;
                    hasChanges = true;
                }

                if (hasChanges)
                    await _dbContext.SaveChangesAsync(ct);
            }
        }

        if (domainUser is not null && !domainUser.IsActive)
            return ServiceResponse<AuthResult>.Failure("Обліковий запис деактивовано.");

        var volunteerRoleResult = await EnsureRoleDefinitionExistsAsync(ApplicationRoleDefinitions.Volunteer);
        if (!volunteerRoleResult.IsSuccess)
            return ServiceResponse<AuthResult>.Failure(volunteerRoleResult.Message);

        if (!await _userManager.IsInRoleAsync(identityUser, ApplicationRoles.Volunteer))
        {
            var addRoleResult = await _userManager.AddToRoleAsync(identityUser, ApplicationRoles.Volunteer);
            if (!addRoleResult.Succeeded)
                return ServiceResponse<AuthResult>.Failure(string.Join("; ", addRoleResult.Errors.Select(e => e.Description)));
        }

        var roles = await _userManager.GetRolesAsync(identityUser);
        var permissions = await GetUserPermissionsAsync(identityUser);
        var tokens = await _tokenService.GenerateTokensAsync(identityUser.Id, email, roles, permissions, ct: ct);

        _logger.LogInformation("User logged in with Google: {Email}", email);

        return ServiceResponse<AuthResult>.Success(new AuthResult(
            tokens.AccessToken,
            tokens.RefreshToken,
            tokens.AccessTokenExpiry,
            tokens.RefreshTokenExpiry,
            domainUser?.Id ?? Guid.Empty,
            email,
            domainUser?.FirstName ?? firstName,
            domainUser?.LastName ?? lastName,
            BuildProfilePhotoUrl(domainUser?.ProfilePhotoStorageKey)));
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

    public async Task<ServiceResponse> LogoutAsync(Guid applicationUserId, string sessionId, CancellationToken ct)
    {
        await _tokenService.RevokeSessionAsync(applicationUserId, sessionId, ct);
        return ServiceResponse.Success();
    }

    public async Task<ServiceResponse<UserProfile>> GetProfileAsync(Guid applicationUserId, CancellationToken ct)
    {
        var identityUser = await _userManager.FindByIdAsync(applicationUserId.ToString());
        if (identityUser is null)
            return ServiceResponse<UserProfile>.Failure("Користувача не знайдено.");

        var domainUser = await FindDomainUserAsync(identityUser, ct);

        var roles = await _userManager.GetRolesAsync(identityUser);

        return ServiceResponse<UserProfile>.Success(CreateUserProfile(identityUser, domainUser, roles));
    }

    public async Task<ServiceResponse<UserProfile>> UpdateProfileAsync(
        Guid applicationUserId,
        string firstName,
        string lastName,
        string? phoneNumber,
        CancellationToken ct)
    {
        var identityUser = await _userManager.FindByIdAsync(applicationUserId.ToString());
        if (identityUser is null)
            return ServiceResponse<UserProfile>.Failure("Користувача не знайдено.");

        var domainUser = await FindDomainUserAsync(identityUser, ct);
        if (domainUser is null)
            return ServiceResponse<UserProfile>.Failure("Профіль користувача не знайдено.");

        domainUser.FirstName = firstName.Trim();
        domainUser.LastName = lastName.Trim();
        domainUser.PhoneNumber = NormalizeOptionalValue(phoneNumber);

        await _dbContext.SaveChangesAsync(ct);

        var roles = await _userManager.GetRolesAsync(identityUser);
        _logger.LogInformation("Profile updated for {ApplicationUserId}", applicationUserId);

        return ServiceResponse<UserProfile>.Success(CreateUserProfile(identityUser, domainUser, roles));
    }

    public async Task<ServiceResponse<UserProfile>> UpdateProfilePhotoAsync(
        Guid applicationUserId,
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken ct)
    {
        var identityUser = await _userManager.FindByIdAsync(applicationUserId.ToString());
        if (identityUser is null)
            return ServiceResponse<UserProfile>.Failure("Користувача не знайдено.");

        var domainUser = await FindDomainUserAsync(identityUser, ct);
        if (domainUser is null)
            return ServiceResponse<UserProfile>.Failure("Профіль користувача не знайдено.");

        var previousStorageKey = domainUser.ProfilePhotoStorageKey;
        var storageKey = await _fileStorage.UploadAsync(fileStream, fileName, contentType, ct);

        domainUser.ProfilePhotoStorageKey = storageKey;
        await _dbContext.SaveChangesAsync(ct);

        if (!string.IsNullOrWhiteSpace(previousStorageKey))
        {
            try
            {
                await _fileStorage.DeleteAsync(previousStorageKey, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete previous profile photo {StorageKey}", previousStorageKey);
            }
        }

        var roles = await _userManager.GetRolesAsync(identityUser);
        _logger.LogInformation("Profile photo updated for {ApplicationUserId}", applicationUserId);

        return ServiceResponse<UserProfile>.Success(CreateUserProfile(identityUser, domainUser, roles));
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
        if (!result.Succeeded)
        {
            return ServiceResponse.Failure(string.Join("; ", result.Errors.Select(e => e.Description)));
        }

        var domainUser = await FindDomainUserAsync(user, ct);
        if (domainUser is not null)
        {
            domainUser.IsActive = !locked;
            await _dbContext.SaveChangesAsync(ct);
        }

        return ServiceResponse.Success(locked ? "Користувача заблоковано." : "Користувача розблоковано.");
    }

    public async Task<ServiceResponse> DeleteUserAsync(Guid applicationUserId, CancellationToken ct)
    {
        var user = await _userManager.FindByIdAsync(applicationUserId.ToString());
        if (user is null)
            return ServiceResponse.Failure("Користувача не знайдено.");

        if (_dbContext is not ApplicationDbContext applicationDbContext)
            throw new InvalidOperationException("ApplicationDbContext is required for transactional user deletion.");

        await using var transaction = await applicationDbContext.Database.BeginTransactionAsync(ct);

        try
        {
            // Видалення доменного User
            var domainUser = await FindDomainUserAsync(user, ct);
            if (domainUser is not null)
            {
                var admins = await _userManager.GetUsersInRoleAsync(ApplicationRoles.Admin);
                var systemAdmin = admins.FirstOrDefault(a => a.Id != user.Id);
                User? systemAdminDomainUser = null;

                if (systemAdmin is not null)
                {
                    systemAdminDomainUser = await FindDomainUserAsync(systemAdmin, ct);
                }

                // Передача організацій іншим учасникам або системному адміністратору
                var ownedOrganizations = await _dbContext.Organizations
                    .Where(o => o.OwnerUserId == domainUser.Id)
                    .Include(o => o.Members)
                    .ToListAsync(ct);

                var reassignedOrganizationOwners = new Dictionary<Guid, Guid>();

                if (ownedOrganizations.Count > 0)
                {
                    foreach (var org in ownedOrganizations)
                    {
                        if (!TryAssignOrganizationOwner(org, domainUser.Id, systemAdminDomainUser, out var replacementOwnerId))
                        {
                            await transaction.RollbackAsync(ct);
                            return ServiceResponse.Failure("Неможливо видалити користувача: організація не має інших учасників і системний адміністратор відсутній.");
                        }

                        reassignedOrganizationOwners[org.Id] = replacementOwnerId;
                    }

                    await _dbContext.SaveChangesAsync(ct);
                }

                var invitations = await _dbContext.Invitations
                    .Where(i => i.InviterId == domainUser.Id)
                    .ToListAsync(ct);

                if (invitations.Count > 0)
                {
                    _dbContext.Invitations.RemoveRange(invitations);
                }

                var campaigns = await _dbContext.Campaigns
                    .Where(c => c.CreatedByUserId == domainUser.Id)
                    .ToListAsync(ct);

                if (campaigns.Count > 0)
                {
                    var organizationOwners = await _dbContext.Organizations
                        .Where(o => campaigns.Select(c => c.OrganizationId).Contains(o.Id))
                        .Select(o => new { o.Id, o.OwnerUserId })
                        .ToDictionaryAsync(o => o.Id, o => o.OwnerUserId, ct);

                    foreach (var campaign in campaigns)
                    {
                        if (!TryResolveCampaignOwnerId(
                                campaign.OrganizationId,
                                domainUser.Id,
                                systemAdminDomainUser,
                                reassignedOrganizationOwners,
                                organizationOwners,
                                out var replacementOwnerId))
                        {
                            await transaction.RollbackAsync(ct);
                            return ServiceResponse.Failure("Неможливо видалити користувача: не знайдено користувача для перепризначення кампаній.");
                        }

                        campaign.CreatedByUserId = replacementOwnerId;
                    }
                }

                await _dbContext.SaveChangesAsync(ct);

                var result = await _userManager.DeleteAsync(user);
                if (!result.Succeeded)
                {
                    await transaction.RollbackAsync(ct);
                    return ServiceResponse.Failure(string.Join("; ", result.Errors.Select(e => e.Description)));
                }

                _dbContext.Users.Remove(domainUser);
                await _dbContext.SaveChangesAsync(ct);
            }
            else
            {
                var result = await _userManager.DeleteAsync(user);
                if (!result.Succeeded)
                {
                    await transaction.RollbackAsync(ct);
                    return ServiceResponse.Failure(string.Join("; ", result.Errors.Select(e => e.Description)));
                }
            }
            await transaction.CommitAsync(ct);
            return ServiceResponse.Success("Користувача видалено.");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            _logger.LogError(ex, "Failed to delete user {ApplicationUserId}", applicationUserId);
            return ServiceResponse.Failure("Не вдалося видалити користувача.");
        }
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

    private bool TryAssignOrganizationOwner(
        Organization organization,
        Guid deletedDomainUserId,
        User? systemAdminDomainUser,
        out Guid replacementOwnerId)
    {
        var nextOwner = organization.Members
            .Where(m => m.UserId != deletedDomainUserId)
            .OrderBy(m => m.JoinedAt)
            .FirstOrDefault();

        if (nextOwner is not null)
        {
            organization.OwnerUserId = nextOwner.UserId;
            nextOwner.Role = OrganizationRole.Owner;
            nextOwner.PermissionsFlags = OrganizationPermissions.All;
            replacementOwnerId = nextOwner.UserId;
            return true;
        }

        if (systemAdminDomainUser is null)
        {
            replacementOwnerId = Guid.Empty;
            return false;
        }

        organization.OwnerUserId = systemAdminDomainUser.Id;

        var existingSystemAdminMember = organization.Members
            .FirstOrDefault(member => member.UserId == systemAdminDomainUser.Id);

        if (existingSystemAdminMember is not null)
        {
            existingSystemAdminMember.Role = OrganizationRole.Owner;
            existingSystemAdminMember.PermissionsFlags = OrganizationPermissions.All;
        }
        else
        {
            _dbContext.OrganizationMembers.Add(new OrganizationMember
            {
                OrganizationId = organization.Id,
                UserId = systemAdminDomainUser.Id,
                Role = OrganizationRole.Owner,
                PermissionsFlags = OrganizationPermissions.All,
                JoinedAt = DateTime.UtcNow
            });
        }

        replacementOwnerId = systemAdminDomainUser.Id;
        return true;
    }

    private static bool TryResolveCampaignOwnerId(
        Guid organizationId,
        Guid deletedDomainUserId,
        User? systemAdminDomainUser,
        IReadOnlyDictionary<Guid, Guid> reassignedOrganizationOwners,
        IReadOnlyDictionary<Guid, Guid> organizationOwners,
        out Guid replacementOwnerId)
    {
        if (reassignedOrganizationOwners.TryGetValue(organizationId, out replacementOwnerId))
        {
            return true;
        }

        if (organizationOwners.TryGetValue(organizationId, out var organizationOwnerId)
            && organizationOwnerId != deletedDomainUserId)
        {
            replacementOwnerId = organizationOwnerId;
            return true;
        }

        if (systemAdminDomainUser is not null)
        {
            replacementOwnerId = systemAdminDomainUser.Id;
            return true;
        }

        replacementOwnerId = Guid.Empty;
        return false;
    }

    private static string BuildPasswordResetUrl(string origin, string email, string token)
    {
        var normalizedOrigin = origin.TrimEnd('/');
        return $"{normalizedOrigin}/reset-password?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
    }

    private static string? NormalizeOptionalValue(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string NormalizeGoogleName(string? givenName, string? fullName, string email)
    {
        if (!string.IsNullOrWhiteSpace(givenName))
            return givenName.Trim();

        if (!string.IsNullOrWhiteSpace(fullName))
            return fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? email;

        return email;
    }

    private static string NormalizeGoogleLastName(string? familyName)
    {
        return string.IsNullOrWhiteSpace(familyName) ? string.Empty : familyName.Trim();
    }

    private static string BuildPasswordResetBody(string callbackUrl)
    {
        return $"""
            <p>Ви отримали цей лист, тому що надійшов запит на скидання пароля.</p>
            <p><a href="{callbackUrl}">Скинути пароль</a></p>
            <p>Якщо ви не надсилали цей запит, просто проігноруйте лист.</p>
            """;
    }

    private string? BuildProfilePhotoUrl(string? storageKey)
    {
        if (string.IsNullOrWhiteSpace(storageKey))
            return null;

        return _fileStorage.GetPublicUrl(storageKey);
    }

    private UserProfile CreateUserProfile(ApplicationUser identityUser, User? domainUser, IList<string> roles)
    {
        return new UserProfile(
            domainUser?.Id ?? Guid.Empty,
            identityUser.Email ?? string.Empty,
            domainUser?.FirstName ?? string.Empty,
            domainUser?.LastName ?? string.Empty,
            domainUser?.PhoneNumber,
            BuildProfilePhotoUrl(domainUser?.ProfilePhotoStorageKey),
            roles);
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
        var existingPermissions = existingClaims
            .Where(claim => claim.Type == "permission" && !string.IsNullOrWhiteSpace(claim.Value))
            .Select(claim => claim.Value!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var expectedPermissions = roleDefinition.Permissions
            .Where(permission => !string.IsNullOrWhiteSpace(permission))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var obsoletePermission in existingPermissions.Except(expectedPermissions).ToList())
        {
            await _roleManager.RemoveClaimAsync(role, new System.Security.Claims.Claim("permission", obsoletePermission));
        }

        foreach (var permission in expectedPermissions.Except(existingPermissions))
        {
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
