namespace ProzoroBanka.Domain.Enums;

public enum MatchConfidence
{
	/// <summary>
	/// Точне співпадіння суми + дати + мерчанта.
	/// </summary>
	Exact = 0,

	/// <summary>
	/// Висока впевненість (fuzzy match мерчанта).
	/// </summary>
	High = 1,

	/// <summary>
	/// Потребує ручної верифікації.
	/// </summary>
	Low = 2,

	/// <summary>
	/// Жодного збігу не знайдено.
	/// </summary>
	None = 3
}
