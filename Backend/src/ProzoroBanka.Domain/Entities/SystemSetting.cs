namespace ProzoroBanka.Domain.Entities;

/// <summary>
/// Просте key-value сховище системних налаштувань, що редагуються з адмінки.
/// </summary>
public class SystemSetting : BaseEntity
{
	public string Key { get; set; } = string.Empty;
	public string Value { get; set; } = string.Empty;
}
