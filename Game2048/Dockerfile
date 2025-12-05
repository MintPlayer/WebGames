# Build stage - using .NET 9 SDK (latest stable) to build .NET 10 preview app
# Note: Update to 10.0 when .NET 10 is released (November 2025)
FROM mcr.microsoft.com/dotnet/nightly/sdk:10.0-preview AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY Game2048.csproj .
RUN dotnet restore

# Copy source code
COPY . .

# Build and publish the application
RUN dotnet publish -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/nightly/aspnet:10.0-preview AS runtime
WORKDIR /app

# Copy published application
COPY --from=build /app/publish .

# Expose port 8080 (default for ASP.NET Core in containers)
EXPOSE 8080

# Set environment variable for ASP.NET Core
ENV ASPNETCORE_URLS=http://+:8080

# Run the application
ENTRYPOINT ["dotnet", "Game2048.dll"]

# Build: docker build -t game2048 .
# Run: docker run -p 8080:8080 game2048
