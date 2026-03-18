namespace ProzoroBanka.API.Configuration;

public sealed class RateLimitingOptions
{
	public bool Enabled { get; set; } = true;

	public RateLimitPolicyOptions General { get; set; } = new();

	public RateLimitPolicyOptions Auth { get; set; } = new();
}

public sealed class RateLimitPolicyOptions
{
	public int PermitLimit { get; set; }

	public int WindowSeconds { get; set; } = 60;

	public int QueueLimit { get; set; }
}