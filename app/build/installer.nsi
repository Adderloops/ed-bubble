; ED BUBBLE · instalador para Windows (NSIS)
; Lo compila scripts/make-installer.js con: VERSION, SRC (carpeta win-unpacked), OUTFILE, ICON.
; Instalación por usuario (sin permisos de administrador) en %LOCALAPPDATA%\Programs\ED BUBBLE.

Unicode true
SetCompressor /SOLID lzma
RequestExecutionLevel user

!define APPNAME "ED BUBBLE"
!define EXE "ED BUBBLE.exe"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\EDBUBBLE"

Name "${APPNAME} ${VERSION}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"
InstallDirRegKey HKCU "Software\EDBUBBLE" "InstallDir"
BrandingText "ED BUBBLE ${VERSION} · Adder"

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define MUI_ICON "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Instalar ${APPNAME} ${VERSION}"
!define MUI_WELCOMEPAGE_TEXT "ED BUBBLE es una ventana para tu segunda pantalla que muestra en vivo los datos de Elite Dangerous y pulsa por ti las teclas de tus controles.$\r$\n$\r$\nEs una versión de prueba (beta). Al terminar, abre la sección Controles de la app y sigue la guía.$\r$\n$\r$\nPulsa Siguiente para continuar."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir ED BUBBLE"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Spanish"

VIProductVersion "${VERSION4}"
VIAddVersionKey /LANG=${LANG_SPANISH} "ProductName" "${APPNAME}"
VIAddVersionKey /LANG=${LANG_SPANISH} "FileDescription" "Instalador de ${APPNAME}"
VIAddVersionKey /LANG=${LANG_SPANISH} "FileVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_SPANISH} "ProductVersion" "${VERSION}"
VIAddVersionKey /LANG=${LANG_SPANISH} "CompanyName" "Adder"
VIAddVersionKey /LANG=${LANG_SPANISH} "LegalCopyright" "© Adder · GPLv3"

Section "ED BUBBLE" SecMain
  SectionIn RO
  ; cerrar la app si está abierta (actualización)
  nsExec::Exec 'taskkill /IM "${EXE}" /F'
  Sleep 500
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR\resources"
  File /r "${SRC}\*.*"
  WriteUninstaller "$INSTDIR\Desinstalar ED BUBBLE.exe"

  CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${EXE}"
  CreateShortcut "$SMPROGRAMS\${APPNAME}.lnk" "$INSTDIR\${EXE}"

  WriteRegStr HKCU "Software\EDBUBBLE" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "Adder"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Desinstalar ED BUBBLE.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "${UNKEY}" "EstimatedSize" "$0"
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /IM "${EXE}" /F'
  Sleep 500
  Delete "$DESKTOP\${APPNAME}.lnk"
  Delete "$SMPROGRAMS\${APPNAME}.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNKEY}"
  DeleteRegKey HKCU "Software\EDBUBBLE"
  ; los ajustes y el registro (%APPDATA%\ed-bubble-app) se conservan
SectionEnd
