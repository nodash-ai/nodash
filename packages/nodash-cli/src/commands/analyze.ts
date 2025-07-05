import { Command } from 'commander';
import chalk from 'chalk';
import { ProjectAnalyzer } from '../services/project-analyzer.js';

export function createAnalyzeCommand(): Command {
  const command = new Command('analyze');
  
  command
    .description('Analyze the current project and detect framework, dependencies, and analytics setup')
    .option('-o, --output <file>', 'Output analysis to specific file')
    .option('--no-save', 'Don\'t save analysis to .nodash/project-analysis.json')
    .option('--json', 'Output analysis as JSON')
    .option('-v, --verbose', 'Show detailed analysis information')
    .action(async (options: any) => {
      try {
        const analyzer = new ProjectAnalyzer();
        
        // Load existing analysis if available
        const existingAnalysis = await analyzer.loadAnalysis();
        if (existingAnalysis && !options.force) {
          console.log(chalk.yellow('⚠️  Existing analysis found. Use --force to re-analyze.'));
          if (options.json) {
            console.log(JSON.stringify(existingAnalysis, null, 2));
          } else {
            displayAnalysis(existingAnalysis, options.verbose);
          }
          return;
        }

        // Perform analysis
        const analysis = await analyzer.analyze();
        
        // Save analysis unless --no-save is specified
        if (options.save !== false) {
          await analyzer.saveAnalysis(analysis);
        }

        // Output analysis
        if (options.json) {
          console.log(JSON.stringify(analysis, null, 2));
        } else {
          displayAnalysis(analysis, options.verbose);
        }

      } catch (error) {
        console.error(chalk.red('❌ Analysis failed:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  command.option('-f, --force', 'Force re-analysis even if existing analysis found');
  
  return command;
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