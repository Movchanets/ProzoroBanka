namespace ProzoroBanka.Application.Common.Interfaces;

public interface ITokenEncryptionService
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
}
