# Rubik's Cube Solver

A web-based 3D Rubik's Cube solver built with ASP.NET Core and Three.js.

## Prerequisites

- [.NET 10.0 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 20+](https://nodejs.org/) (for TypeScript type definitions)

## Getting Started

### Install Dependencies

```bash
npm install
```

### Build and Run

```bash
dotnet build
dotnet run
```

The application will be available at `https://localhost:5001` or `http://localhost:5000`.

## Docker

### Build the Image

```bash
docker build -t rubiksolver .
```

### Run the Container

```bash
docker run -p 8080:8080 rubiksolver
```

The application will be available at `http://localhost:8080`.

## Project Structure

```
Rubiksolver/
├── Controllers/        # API controllers
├── Models/             # Data models
├── Services/           # Business logic (cube solver)
├── Scripts/            # TypeScript source files
├── Styles/             # SCSS source files
├── wwwroot/            # Static files (compiled JS/CSS)
│   ├── css/            # Compiled CSS output
│   └── js/             # Compiled JS output
├── Dockerfile          # Docker build configuration
└── tsconfig.json       # TypeScript configuration
```

## Development

### TypeScript

TypeScript source files are located in `Scripts/`. They are automatically compiled to `wwwroot/js/` during build via the `Microsoft.TypeScript.MSBuild` package.

### SCSS

SCSS source files are located in `Styles/`. They are automatically compiled to CSS during build via the `DartSassBuilder` package and copied to `wwwroot/css/`.

### Frontend Dependencies

Three.js is loaded via CDN using an import map in `index.html`. Type definitions for TypeScript are installed via npm (`@types/three`).
