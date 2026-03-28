using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace ProzoroBanka.IntegrationTests.Api;

public class AdminUserManagementEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
	private readonly HttpClient _client;

	public AdminUserManagementEndpointsTests(TestWebApplicationFactory factory)
	{
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task SetUserLockout_ByAdmin_LocksAndUnlocksUser()
	{
		await AuthenticateAsAdminAsync();

		var targetEmail = $"lockout-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(targetEmail, "Password123!");

		var userId = await GetUserIdByEmailAsync(targetEmail);

		var lockResponse = await _client.PutAsJsonAsync($"/api/admin/users/{userId}/lockout", new
		{
			locked = true
		});

		Assert.Equal(HttpStatusCode.OK, lockResponse.StatusCode);

		var lockedLoginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email = targetEmail,
			password = "Password123!",
			turnstileToken = "test-token"
		});
		Assert.Equal(HttpStatusCode.Unauthorized, lockedLoginResponse.StatusCode);

		await AuthenticateAsAdminAsync();
		var unlockResponse = await _client.PutAsJsonAsync($"/api/admin/users/{userId}/lockout", new
		{
			locked = false
		});

		Assert.Equal(HttpStatusCode.OK, unlockResponse.StatusCode);

		var unlockedLoginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email = targetEmail,
			password = "Password123!",
			turnstileToken = "test-token"
		});
		Assert.Equal(HttpStatusCode.OK, unlockedLoginResponse.StatusCode);
	}

	[Fact]
	public async Task DeleteUser_ByAdmin_RemovesUserFromAdminList()
	{
		await AuthenticateAsAdminAsync();

		var targetEmail = $"delete-{Guid.NewGuid():N}@example.com";
		await RegisterAsync(targetEmail, "Password123!");

		var userId = await GetUserIdByEmailAsync(targetEmail);

		var deleteResponse = await _client.DeleteAsync($"/api/admin/users/{userId}");
		Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

		await AuthenticateAsAdminAsync();
		var usersResponse = await _client.GetAsync("/api/admin/users?page=1&pageSize=200");
		usersResponse.EnsureSuccessStatusCode();

		var usersJson = await usersResponse.Content.ReadFromJsonAsync<JsonElement>();
		var users = usersJson.GetProperty("items").EnumerateArray().ToList();
		Assert.DoesNotContain(users, user =>
			string.Equals(user.GetProperty("email").GetString(), targetEmail, StringComparison.OrdinalIgnoreCase));
	}

	[Fact]
	public async Task UserManagementEndpoints_WithoutAuth_ReturnUnauthorized()
	{
		var randomUserId = Guid.NewGuid();

		var lockResponse = await _client.PutAsJsonAsync($"/api/admin/users/{randomUserId}/lockout", new
		{
			locked = true
		});
		Assert.Equal(HttpStatusCode.Unauthorized, lockResponse.StatusCode);

		var deleteResponse = await _client.DeleteAsync($"/api/admin/users/{randomUserId}");
		Assert.Equal(HttpStatusCode.Unauthorized, deleteResponse.StatusCode);
	}

	[Fact]
	public async Task GetUsers_WithFilters_ReturnsExpectedSubset()
	{
		await AuthenticateAsAdminAsync();

		var unique = Guid.NewGuid().ToString("N")[..8];
		var targetEmail = $"filtered-{unique}@example.com";
		await RegisterAsync(targetEmail, "Password123!");

		var userId = await GetUserIdByEmailAsync(targetEmail);

		var lockResponse = await _client.PutAsJsonAsync($"/api/admin/users/{userId}/lockout", new
		{
			locked = true
		});
		lockResponse.EnsureSuccessStatusCode();

		await AuthenticateAsAdminAsync();
		var response = await _client.GetAsync($"/api/admin/users?page=1&pageSize=200&search={Uri.EscapeDataString(unique)}&isActive=false&role=Volunteer");
		response.EnsureSuccessStatusCode();

		var usersJson = await response.Content.ReadFromJsonAsync<JsonElement>();
		var users = usersJson.GetProperty("items").EnumerateArray().ToList();

		Assert.Contains(users, user =>
			string.Equals(user.GetProperty("email").GetString(), targetEmail, StringComparison.OrdinalIgnoreCase));
	}

	private async Task RegisterAsync(string email, string password)
	{
		var response = await _client.PostAsJsonAsync("/api/auth/register", new
		{
			email,
			password,
			confirmPassword = password,
			firstName = "Admin",
			lastName = "Managed",
			turnstileToken = "test-token"
		});

		response.EnsureSuccessStatusCode();
	}

	private async Task<Guid> GetUserIdByEmailAsync(string email)
	{
		var usersResponse = await _client.GetAsync("/api/admin/users?page=1&pageSize=200");
		usersResponse.EnsureSuccessStatusCode();

		var usersJson = await usersResponse.Content.ReadFromJsonAsync<JsonElement>();
		var users = usersJson.GetProperty("items").EnumerateArray();

		var user = users.FirstOrDefault(item =>
			string.Equals(item.GetProperty("email").GetString(), email, StringComparison.OrdinalIgnoreCase));

		Assert.True(user.ValueKind != JsonValueKind.Undefined, $"User with email '{email}' was not found in admin users list.");
		return user.GetProperty("id").GetGuid();
	}

	private async Task AuthenticateAsAdminAsync()
	{
		var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
		{
			email = "admin@example.com",
			password = "Admin123!ChangeMe",
			turnstileToken = "test-token"
		});
		loginResponse.EnsureSuccessStatusCode();

		var loginJson = await loginResponse.Content.ReadFromJsonAsync<JsonElement>();
		var accessToken = loginJson.GetProperty("accessToken").GetString();
		_client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
	}
}