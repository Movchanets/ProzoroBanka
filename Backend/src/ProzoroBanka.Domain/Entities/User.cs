namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Чистий доменний користувач (без Identity-залежностей).
/// Зберігає бізнес-дані профілю, пов'язані з волонтерською діяльністю.
/// </summary>
public class User : BaseEntity
{
    /// <summary>
    /// Ідентифікатор пов'язаного Identity-користувача.
    /// </summary>
    public Guid? IdentityUserId { get; set; }

    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? MiddleName { get; set; }
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Ключ збереження фото профілю (storage key, не URL).
    /// </summary>
    public string? ProfilePhotoStorageKey { get; set; }

    /// <summary>
    /// Зашифрований Monobank API Token (AES-256-GCM).
    /// </summary>
    public string? EncryptedMonobankToken { get; set; }

    /// <summary>
    /// Чи активний обліковий запис.
    /// </summary>
    public bool IsActive { get; set; } = true;

    // ── Navigation properties ──

    public ICollection<Receipt> Receipts { get; set; } = new List<Receipt>();
    public ICollection<MonobankTransaction> MonobankTransactions { get; set; } = new List<MonobankTransaction>();
    public ICollection<Organization> OwnedOrganizations { get; set; } = new List<Organization>();
    public ICollection<OrganizationMember> OrganizationMemberships { get; set; } = new List<OrganizationMember>();
}
