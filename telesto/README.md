# Geological 3D Grid Generator

A professional React-based web application for generating and visualizing 3D geological grids from horizon and fault surface data. This tool supports advanced geological modeling with realistic fault handling, block joining, customizable visualizations, and export capabilities.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [File Format Requirements](#file-format-requirements)
- [Contributing](#contributing)
- [License](#license)

## Overview
The Geological 3D Grid Generator is a powerful tool for geoscientists and reservoir engineers to create 3D subsurface models from horizon and fault data. Built with React and Tailwind CSS, it provides an interactive interface for uploading CSV data, generating grids with geological properties (e.g., porosity, permeability), visualizing results in 3D, and exporting models for further analysis. The application supports block selection and joining, multiple color schemes, and performance optimizations for handling large datasets.

## Features
- **Data Input**: Upload horizon and fault surfaces in CSV format or generate realistic sample data.
- **3D Grid Generation**: Create layered geological grids with properties like bulk volume, porosity, permeability, saturation, and structural dip.
- **Block Joining**: Select and join grid blocks to represent geological features or reservoir compartments.
- **Interactive Visualization**: View grids in 3D with customizable modes (blocks, points, wireframe) and camera controls (rotate, pan, zoom).
- **Color Customization**: Choose from predefined color schemes (Geological, Ocean, Volcanic, Arctic) or customize colors for layers, faults, wells, and joined blocks.
- **Export Capabilities**: Export generated grids as CSV files with detailed geological properties.
- **Performance Optimizations**: Efficient grid generation with batch processing and level-of-detail rendering for large datasets.
- **User-Friendly Interface**: Intuitive controls, progress feedback, and real-time visualization updates.

## Installation
To run the Geological 3D Grid Generator locally, follow these steps:

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- A modern web browser (Chrome, Firefox, Edge)

### Steps
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/geological-3d-grid-generator.git
   cd geological-3d-grid-generator
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```
   or
   ```bash
   yarn install
   ```

3. **Start the Development Server**:
   ```bash
   npm start
   ```
   or
   ```bash
   yarn start
   ```
   This will launch the application at `http://localhost:3000`.

4. **Build for Production** (optional):
   ```bash
   npm run build
   ```
   Serve the `build` directory using a static server (e.g., `npx serve -s build`).

### Dependencies
- React (`react`, `react-dom`)
- Lucide Icons (`lucide-react`) for UI icons
- Tailwind CSS for styling

## Usage
1. **Launch the Application**:
   Open the application in your browser (`http://localhost:3000` or the deployed URL).

2. **Upload Data**:
   - Navigate to the "Data Upload" section.
   - Upload horizon and fault CSV files (see [File Format Requirements](#file-format-requirements)).
   - Alternatively, use the "Sample Data" buttons to generate realistic horizons and faults.

3. **Configure Parameters**:
   - Set the number of layers (2–25) using the slider.
   - Choose a view mode (3D Blocks, Point Cloud, Wireframe).
   - Toggle visibility of faults and wells.
   - Select a color scheme or customize colors in the "Color Schemes" section.

4. **Generate Grid**:
   - Click "Generate Advanced Grid" to create the 3D grid.
   - Monitor progress via the loading overlay and progress bar.
   - If generation takes too long, try increasing grid spacing or reducing layers.

5. **Visualize and Interact**:
   - Use the mouse to rotate (drag), pan (Shift+drag), or zoom (scroll).
   - Enable "Joining Mode" to select and join grid blocks by clicking them.
   - Reset the view or toggle visualization visibility as needed.

6. **Export Data**:
   - Click "Export Advanced Grid" to download the grid as a CSV file, including geological properties and joined block information.

## File Format Requirements
The application accepts CSV files for horizons and faults with the following formats:

### Horizon CSV
- **Columns**: Must include X, Y, Z coordinates (case-insensitive).
- **Example**:
  ```
  x,y,z
  0,0,2000
  100,0,2010
  0,100,2005
  100,100,2015
  ```
- **Notes**:
  - Column names can include variations like `easting`, `northing`, `depth`, or `elevation`.
  - At least two horizon files (top and bottom surfaces) are required for grid generation.

### Fault CSV
- **Columns**: Must include X, Y, Z coordinates and an optional `SegId` (segment identifier) for fault classification.
- **Example**:
  ```
  x,y,z,segId
  500,0,1500,1
  500,50,1500,1
  600,0,1600,2
  600,50,1600,2
  ```
- **Notes**:
  - `SegId` is used to differentiate fault segments.
  - Fault data is optional but enhances grid realism.

### Tips
- Ensure coordinates are numeric and in a consistent unit system (e.g., meters).
- Remove empty lines or invalid rows to prevent parsing errors.
- Use sample data generation to test the application with valid inputs.

## Contributing
Contributions are welcome! To contribute:

1. **Fork the Repository**:
   ```bash
   git clone https://github.com/your-username/geological-3d-grid-generator.git
   ```

2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**:
   - Follow the existing code style (ESLint and Prettier recommended).
   - Add tests for new features using a testing framework like Jest.
   - Update this README if new features or requirements are added.

4. **Submit a Pull Request**:
   - Push your changes to your fork.
   - Open a pull request with a clear description of the changes and their purpose.

### Development Tips
- **Performance**: Optimize heavy computations (e.g., grid generation) using Web Workers or spatial indexing.
- **Testing**: Test with large datasets to ensure performance and stability.
- **Issues**: Check the GitHub Issues tab for known bugs or feature requests.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
