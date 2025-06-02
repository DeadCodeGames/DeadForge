!macro customInstall
  DetailPrint "Checking/Installing .NET 8.0 Runtime..."
  SetOutPath "$TEMP"
  
  ; Extract the .NET installer from build resources
  File "${BUILD_RESOURCES_DIR}\dotnet-runtime-8.0.16-win-x64.exe"
  
  ; Execute the installer - it will handle checking if already installed
  ExecWait '"$TEMP\dotnet-runtime-8.0.16-win-x64.exe" /install /quiet /norestart' $0
  
  ; Check return codes
  ${Switch} $0
    ${Case} 0
      DetailPrint ".NET 8.0 Runtime installation completed successfully."
      ${Break}
    ${Case} 1641
    ${Case} 3010
      DetailPrint ".NET 8.0 Runtime installation completed (reboot may be required)."
      ${Break}
    ${Case} 1638
      DetailPrint ".NET 8.0 Runtime is already installed."
      ${Break}
    ${Default}
      MessageBox MB_ICONEXCLAMATION "Warning: .NET 8.0 Runtime installation returned code $0.$\n$\nThe application may not work correctly.$\n$\nYou can manually download .NET 8.0 from: https://dotnet.microsoft.com/download/dotnet/8.0"
      ${Break}
  ${EndSwitch}
  
  ; Clean up
  Delete "$TEMP\dotnet-runtime-8.0.16-win-x64.exe"
!macroend