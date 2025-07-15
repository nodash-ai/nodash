import { Command } from 'commander';
import chalk from 'chalk';
import { ProjectAnalyzer } from '../services/project-analyzer.js';
import { EnhancedProjectAnalyzer } from '../services/enhanced-project-analyzer.js';
import type { ProjectAnalysis } from '../types.js';

export function createAnalyzeCommand(): Command {
  const command = new Command('analyze');
  
  command
    .description('Analyze the current project and detect framework, dependencies, and analytics setup')
    .argument('[path]', 'Path to analyze (defaults to current directory)', '.')
    .option('-o, --output <file>', 'Output analysis to specific file')
    .option('--no-save', 'Don\'t save analysis to .nodash/project-analysis.json')
    .option('--json', 'Output analysis as JSON')
    .option('-v, --verbose', 'Show detailed analysis information')
    .option('--setup', 'Generate setup files for detected framework')
    .action(async (path: string, options: any) => {
      try {
        const analyzer = new ProjectAnalyzer(path);
        const enhancedAnalyzer = new EnhancedProjectAnalyzer(path);
        
        // Load existing analysis if available
        const existingAnalysis = await analyzer.loadAnalysis();
        if (existingAnalysis && !options.force) {
          console.log(chalk.yellow('⚠️  Existing analysis found. Use --force to re-analyze.'));
          if (options.json) {
            console.log(JSON.stringify(existingAnalysis, null, 2));
          } else {
            await displayEnhancedAnalysis(existingAnalysis, enhancedAnalyzer, options.verbose);
          }
          return;
        }

        // Perform analysis
        const analysis = await analyzer.analyze();
        
        // Save analysis unless --no-save is specified
        if (options.save !== false) {
          await analyzer.saveAnalysis(analysis);
        }

        // Generate setup files if requested
        if (options.setup) {
          await enhancedAnalyzer.generateSetupFiles(analysis, path);
        }

        // Output analysis
        if (options.json) {
          const enhancedData = {
            ...analysis,
            sdkExamples: enhancedAnalyzer.generateSDKExamples(analysis),
            setupValidation: await enhancedAnalyzer.validateExistingSetup()
          };
          console.log(JSON.stringify(enhancedData, null, 2));
        } else {
          await displayEnhancedAnalysis(analysis, enhancedAnalyzer, options.verbose);
        }

      } catch (error) {
        console.error(chalk.red('❌ Analysis failed:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  command.option('-f, --force', 'Force re-analysis even if existing analysis found');
  
  return command;
}

async function displayEnhancedAnalysis(analysis: ProjectAnalysis, enhancedAnalyzer: EnhancedProjectAnalyzer, verbose?: boolean): Promise<void> {
  console.log('\n' + chalk.bold.blue('📊 Project Analysis Results'));
  console.log(chalk.gray('─'.repeat(50)));
  
  console.log(`${chalk.bold('Language:')} ${chalk.green(analysis.language)}`);
  
  if (analysis.framework) {
    console.log(`${chalk.bold('Framework:')} ${chalk.green(analysis.framework)}`);
  }
  
  console.log(`${chalk.bold('Package Manager:')} ${chalk.cyan(analysis.packageManager)}`);
  
  if (analysis.hasAnalyticsSDK) {
    console.log(`${chalk.bold('Analytics Libraries:')} ${chalk.yellow(analysis.analyticsLibraries.join(', '))}`);
  } else {
    console.log(`${chalk.bold('Analytics Libraries:')} ${chalk.gray('None detected')}`);
  }
  
  console.log(`${chalk.bold('Dependencies:')} ${Object.keys(analysis.dependencies).length} packages`);
  console.log(`${chalk.bold('Dev Dependencies:')} ${Object.keys(analysis.devDependencies).length} packages`);
  
  // Show setup validation
  const setupValidation = await enhancedAnalyzer.validateExistingSetup();
  console.log('\n' + chalk.bold.cyan('🔧 Setup Status:'));
  console.log(`${chalk.bold('Nodash SDK:')} ${setupValidation.hasSDK ? chalk.green('✅ Installed') : chalk.red('❌ Not installed')}`);
  console.log(`${chalk.bold('Configuration:')} ${setupValidation.hasConfig ? chalk.green('✅ Found') : chalk.red('❌ Not found')}`);
  
  if (setupValidation.issues.length > 0) {
    console.log('\n' + chalk.bold.red('❌ Issues Found:'));
    setupValidation.issues.forEach(issue => {
      console.log(`   ${chalk.red(issue)}`);
    });
  }
  
  if (setupValidation.recommendations.length > 0) {
    console.log('\n' + chalk.bold.yellow('💡 Setup Recommendations:'));
    setupValidation.recommendations.forEach(rec => {
      console.log(`   ${chalk.yellow(rec)}`);
    });
  }
  
  // Show SDK integration examples
  const examples = enhancedAnalyzer.generateSDKExamples(analysis);
  if (examples.length > 0) {
    console.log('\n' + chalk.bold.magenta('🚀 SDK Integration Examples:'));
    examples.forEach((example, index) => {
      console.log(`\n${chalk.bold(`${index + 1}. ${example.filename}`)} - ${chalk.gray(example.description)}`);
      if (verbose) {
        console.log(chalk.gray('─'.repeat(40)));
        console.log(chalk.dim(example.code.split('\n').slice(0, 10).join('\n')));
        if (example.code.split('\n').length > 10) {
          console.log(chalk.dim('... (truncated)'));
        }
      }
    });
    
    if (!verbose) {
      console.log(chalk.yellow('\n💡 Use --verbose to see code examples'));
    }
    console.log(chalk.yellow('💡 Use --setup to generate these files in your project'));
  }
  
  // Show original recommendations if available
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    console.log('\n' + chalk.bold.cyan('💡 General Recommendations:'));
    analysis.recommendations.forEach((rec: string, index: number) => {
      console.log(`  ${chalk.cyan((index + 1).toString())}. ${rec}`);
    });
  }
  
  // Show verbose information if requested
  if (verbose) {
    console.log('\n' + chalk.bold.magenta('🔍 Verbose Information:'));
    console.log(`${chalk.bold('Project Root:')} ${chalk.gray(analysis.projectRoot)}`);
    console.log(`${chalk.bold('Analyzed At:')} ${chalk.gray(new Date(analysis.analyzedAt).toLocaleString())}`);
    
    if (Object.keys(analysis.dependencies).length > 0) {
      console.log(`${chalk.bold('Dependencies:')} ${chalk.gray(Object.keys(analysis.dependencies).join(', '))}`);
    }
    if (Object.keys(analysis.devDependencies).length > 0) {
      console.log(`${chalk.bold('Dev Dependencies:')} ${chalk.gray(Object.keys(analysis.devDependencies).join(', '))}`);
    }
  }
  
  console.log('\n' + chalk.green('✅ Analysis complete!'));
}

function displayAnalysis(analysis: any, verbose?: boolean): void {
  console.log('\n' + chalk.bold.blue('📊 Project Analysis Results'));
  console.log(chalk.gray('─'.repeat(50)));
  
  console.log(`${chalk.bold('Language:')} ${chalk.green(analysis.language)}`);
  
  if (analysis.framework) {
    console.log(`${chalk.bold('Framework:')} ${chalk.green(analysis.framework)}`);
  }
  
  console.log(`${chalk.bold('Package Manager:')} ${chalk.cyan(analysis.packageManager)}`);
  
  if (analysis.hasAnalyticsSDK) {
    console.log(`${chalk.bold('Analytics Libraries:')} ${chalk.yellow(analysis.analyticsLibraries.join(', '))}`);
  } else {
    console.log(`${chalk.bold('Analytics Libraries:')} ${chalk.gray('None detected')}`);
  }
  
  console.log(`${chalk.bold('Dependencies:')} ${Object.keys(analysis.dependencies).length} packages`);
  console.log(`${chalk.bold('Dev Dependencies:')} ${Object.keys(analysis.devDependencies).length} packages`);
  
  // Show recommendations if available
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    console.log('\n' + chalk.bold.cyan('💡 Recommendations:'));
    analysis.recommendations.forEach((rec: string, index: number) => {
      console.log(`  ${chalk.cyan((index + 1).toString())}. ${rec}`);
    });
  }
  
  // Show verbose information if requested
  if (verbose) {
    console.log('\n' + chalk.bold.magenta('🔍 Verbose Information:'));
    console.log(`${chalk.bold('Project Root:')} ${chalk.gray(analysis.projectRoot)}`);
    console.log(`${chalk.bold('Analyzed At:')} ${chalk.gray(new Date(analysis.analyzedAt).toLocaleString())}`);
    
    if (Object.keys(analysis.dependencies).length > 0) {
      console.log(`${chalk.bold('Dependencies:')} ${chalk.gray(Object.keys(analysis.dependencies).join(', '))}`);
    }
    if (Object.keys(analysis.devDependencies).length > 0) {
      console.log(`${chalk.bold('Dev Dependencies:')} ${chalk.gray(Object.keys(analysis.devDependencies).join(', '))}`);
    }
  }
  
  console.log('\n' + chalk.green('✅ Analysis complete!'));
} 