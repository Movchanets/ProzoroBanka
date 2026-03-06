using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using ProzoroBanka.Application.Common.Interfaces;

namespace ProzoroBanka.Infrastructure.Services.Encryption;

/// <summary>
/// AES-256-GCM шифрування для Monobank API Token.
/// </summary>
public class AesTokenEncryptionService : ITokenEncryptionService
{
	private readonly byte[] _key;

	public AesTokenEncryptionService(IConfiguration configuration)
	{
		var keyString = configuration["Encryption:Key"]
			?? throw new InvalidOperationException("Encryption:Key is not configured");

		_key = Convert.FromBase64String(keyString);

		if (_key.Length != 32)
			throw new InvalidOperationException("Encryption key must be 256 bits (32 bytes, base64-encoded).");
	}

	public string Encrypt(string plainText)
	{
		var nonce = new byte[12]; // AES-GCM nonce (96 bits)
		RandomNumberGenerator.Fill(nonce);

		var plainBytes = Encoding.UTF8.GetBytes(plainText);
		var cipherBytes = new byte[plainBytes.Length];
		var tag = new byte[16]; // 128-bit auth tag

		using var aes = new AesGcm(_key, 16);
		aes.Encrypt(nonce, plainBytes, cipherBytes, tag);

		// Формат: nonce(12) + tag(16) + cipher(N)
		var result = new byte[nonce.Length + tag.Length + cipherBytes.Length];
		Buffer.BlockCopy(nonce, 0, result, 0, nonce.Length);
		Buffer.BlockCopy(tag, 0, result, nonce.Length, tag.Length);
		Buffer.BlockCopy(cipherBytes, 0, result, nonce.Length + tag.Length, cipherBytes.Length);

		return Convert.ToBase64String(result);
	}

	public string Decrypt(string cipherText)
	{
		var fullCipher = Convert.FromBase64String(cipherText);

		var nonce = new byte[12];
		var tag = new byte[16];
		var cipherBytes = new byte[fullCipher.Length - nonce.Length - tag.Length];

		Buffer.BlockCopy(fullCipher, 0, nonce, 0, nonce.Length);
		Buffer.BlockCopy(fullCipher, nonce.Length, tag, 0, tag.Length);
		Buffer.BlockCopy(fullCipher, nonce.Length + tag.Length, cipherBytes, 0, cipherBytes.Length);

		var plainBytes = new byte[cipherBytes.Length];

		using var aes = new AesGcm(_key, 16);
		aes.Decrypt(nonce, cipherBytes, tag, plainBytes);

		return Encoding.UTF8.GetString(plainBytes);
	}
}
