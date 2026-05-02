using Microsoft.AspNetCore.Http;
using ProzoroBanka.Application.Common.Models;

namespace ProzoroBanka.API.Security;

public interface IAuthCookieManager
{
    void SetAuthCookies(HttpResponse response, TokenResponse tokens);
    void ClearAuthCookies(HttpResponse response);
    string SetCsrfCookie(HttpResponse response, DateTime? expiresAtUtc = null);
}
