using System.Security.Cryptography;

namespace ProzoroBanka.Application.Organizations.InvitationSupport;

/// <summary>
/// Generates URL-safe invitation tokens from a single place so invitation creation
/// uses one encoding strategy across link and email flows.
/// </summary>
internal static class InvitationTokenGenerator
{
	public static string Generate()
	{
		var bytes = new byte[32];
		RandomNumberGenerator.Fill(bytes);

		return Convert.ToBase64String(bytes)
			.Replace('+', '-')
			.Replace('/', '_')
			.TrimEnd('=');
	}
}