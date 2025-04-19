/**
 * Script to install Windows build tools if needed
 * This script will check if running on Windows and install the required build tools
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { execSync } = require('child_process');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const os = require('os');

// Check if running in CI environment
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

// Only run on Windows
if (os.platform() === 'win32') {
  console.log('Windows detected, checking for build tools...');

  try {
    // Try to detect if build tools are already installed
    const vsOutput = execSync('where cl.exe', { stdio: 'pipe' }).toString();
    if (vsOutput && vsOutput.includes('cl.exe')) {
      console.log('Visual C++ compiler found, skipping installation of build tools');
      process.exit(0);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    // cl.exe not found
    if (isCI) {
      // If in CI environment, we should have build tools already
      console.log('Running in CI environment, setting up build environment...');
      try {
        // Set msvs_version for node-gyp by creating/updating .npmrc
        // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
        const fs = require('fs');
        // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
        const path = require('path');
        const userProfile = process.env.USERPROFILE || process.env.HOME;
        const npmrcPath = path.join(userProfile, '.npmrc');

        // Check if .npmrc exists and read its content
        let npmrcContent = '';
        if (fs.existsSync(npmrcPath)) {
          npmrcContent = fs.readFileSync(npmrcPath, 'utf8');
        }

        // Add or update msvs_version
        if (!npmrcContent.includes('msvs_version=')) {
          npmrcContent += '\nmsvs_version=2022\n';
        } else {
          npmrcContent = npmrcContent.replace(/msvs_version=.*(\r?\n|$)/g, 'msvs_version=2022$1');
        }

        // Write back to .npmrc
        fs.writeFileSync(npmrcPath, npmrcContent);
        console.log('Build environment configured for CI');
        process.exit(0);
      } catch (ciError) {
        console.error('Failed to configure CI build environment:', ciError);
        process.exit(1);
      }
    } else {
      // Not in CI, proceed with normal installation
      console.log('Visual C++ compiler not found, installing Windows build tools...');
      console.log('This may take a while...');

      try {
        // Install windows-build-tools globally
        console.log('Installing windows-build-tools...');
        execSync('npm install --global --production windows-build-tools', {
          stdio: 'inherit',
          timeout: 300000, // 5 minutes timeout
        });

        console.log('Windows build tools installed successfully');

        // Set Python path
        console.log('Setting Python path...');
        const pythonPath = `${process.env.USERPROFILE}\\.windows-build-tools\\python27\\python.exe`;
        execSync(`npm config set python ${pythonPath}`, { stdio: 'inherit' });

        console.log('Build environment is now ready for node-gyp');
      } catch (installError) {
        console.error('Failed to install Windows build tools automatically');
        console.error(installError);
        console.error('\nPlease install the following manually:');
        console.error('1. Install Visual Studio Build Tools with C++ workload');
        console.error('2. Install Python 2.7 or 3.x');
        console.error('3. Set npm config: npm config set msvs_version 2019');
        process.exit(1);
      }
    }
  }
} else {
  console.log('Not running on Windows, skipping build tools installation');
}
