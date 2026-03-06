using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using ProzoroBanka.Application.Common.Interfaces;
using ProzoroBanka.Infrastructure.Data;

namespace ProzoroBanka.Infrastructure.Services;

/// <summary>
/// Unit of Work реалізація поверх ApplicationDbContext.
/// </summary>
public class UnitOfWork : IUnitOfWork
{
	private readonly ApplicationDbContext _context;

	public UnitOfWork(ApplicationDbContext context)
	{
		_context = context;
	}

	public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
		=> _context.SaveChangesAsync(cancellationToken);

	public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
		=> _context.Database.BeginTransactionAsync(cancellationToken);

	public Task<IDbContextTransaction> BeginTransactionAsync(IsolationLevel isolationLevel, CancellationToken cancellationToken = default)
		=> _context.Database.BeginTransactionAsync(isolationLevel, cancellationToken);

	public async Task<TResult> ExecuteInTransactionAsync<TResult>(
		Func<CancellationToken, Task<TResult>> action,
		CancellationToken cancellationToken = default)
	{
		await using var transaction = await BeginTransactionAsync(cancellationToken);
		try
		{
			var result = await action(cancellationToken);
			await _context.SaveChangesAsync(cancellationToken);
			await transaction.CommitAsync(cancellationToken);
			return result;
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}

	public async Task ExecuteInTransactionAsync(
		Func<CancellationToken, Task> action,
		CancellationToken cancellationToken = default)
	{
		await using var transaction = await BeginTransactionAsync(cancellationToken);
		try
		{
			await action(cancellationToken);
			await _context.SaveChangesAsync(cancellationToken);
			await transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}
}
