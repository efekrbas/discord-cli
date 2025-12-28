import chalk from 'chalk';
import gradient from 'gradient-string';

export function showLogo() {
  const logo = `
██████╗ ██╗███████╗ ██████╗ ██████╗ ██████╗ ██████╗ 
██╔══██╗██║██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔══██╗
██║  ██║██║███████╗██║     ██║   ██║██████╔╝██║  ██║
██║  ██║██║╚════██║██║     ██║   ██║██╔══██╗██║  ██║
██████╔╝██║███████║╚██████╗╚██████╔╝██║  ██║██████╔╝
╚═════╝ ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ 
                                                     
 ██████╗██╗     ██╗                                  
██╔════╝██║     ██║                                  
██║     ██║     ██║                                  
██║     ██║     ██║                                  
╚██████╗███████╗██║                                  
 ╚═════╝╚══════╝╚═╝                                  
`;

  // Gradient renklerle logo göster
  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];
  const gradientLogo = gradient(colors)(logo);
  console.log(gradientLogo);
}

