using System.Net;
using System.Text.Json;
using FluentValidation;

namespace ProzoroBanka.API.Middleware;

/// <summary>
/// Глобальна обробка помилок — ловить FluentValidation, SecurityTokenException, тощо.
/// </summary>
public class GlobalExceptionHandlerMiddleware
{
	private readonly RequestDelegate _next;
	private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;

	public GlobalExceptionHandlerMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlerMiddleware> logger)
	{
		_next = next;
		_logger = logger;
	}

	public async Task InvokeAsync(HttpContext context)
	{
		try
		{
			await _next(context);
		}
		catch (ValidationException ex)
		{
			_logger.LogWarning(ex, "Validation failed");
			context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
			context.Response.ContentType = "application/json";

			var errors = ex.Errors
				.GroupBy(e => e.PropertyName)
				.ToDictionary(
					g => g.Key,
					g => g.Select(e => e.ErrorMessage).ToArray());

			var response = new
			{
				Type = "ValidationError",
				Title = "Помилка валідації",
				Status = 400,
				Errors = errors
			};

			await context.Response.WriteAsync(
				JsonSerializer.Serialize(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
		}
		catch (UnauthorizedAccessException ex)
		{
			_logger.LogWarning(ex, "Unauthorized access");
			context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
			context.Response.ContentType = "application/json";

			await context.Response.WriteAsync(
				JsonSerializer.Serialize(new { Error = "Доступ заборонено." }));
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
			context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
			context.Response.ContentType = "application/json";

			var response = new
			{
				Type = "ServerError",
				Title = "Внутрішня помилка сервера",
				Status = 500,
#if DEBUG
				Detail = ex.Message,
				StackTrace = ex.StackTrace
#endif
			};

			await context.Response.WriteAsync(
				JsonSerializer.Serialize(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
		}
	}
}

/// <summary>
/// Extension для реєстрації middleware.
/// </summary>
public static class GlobalExceptionHandlerMiddlewareExtensions
{
	public static IApplicationBuilder UseGlobalExceptionHandler(this IApplicationBuilder app)
	{
		return app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
	}
}
