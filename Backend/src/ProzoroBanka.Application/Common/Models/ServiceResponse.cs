namespace ProzoroBanka.Application.Common.Models;

/// <summary>
/// Стандартна обгортка відповіді сервісу з типізованим payload.
/// </summary>
/// <typeparam name="T">Тип даних відповіді.</typeparam>
public record ServiceResponse<T>(
	bool IsSuccess,
	string Message,
	T? Payload = default)
{
	/// <summary>
	/// Створює успішну відповідь.
	/// </summary>
	public static ServiceResponse<T> Success(T payload, string message = "")
		=> new(true, message, payload);

	/// <summary>
	/// Створює відповідь з помилкою.
	/// </summary>
	public static ServiceResponse<T> Failure(string message)
		=> new(false, message);
}

/// <summary>
/// Стандартна обгортка відповіді сервісу без payload.
/// </summary>
public record ServiceResponse(
	bool IsSuccess,
	string Message)
{
	/// <summary>
	/// Створює успішну відповідь.
	/// </summary>
	public static ServiceResponse Success(string message = "")
		=> new(true, message);

	/// <summary>
	/// Створює відповідь з помилкою.
	/// </summary>
	public static ServiceResponse Failure(string message)
		=> new(false, message);
}
