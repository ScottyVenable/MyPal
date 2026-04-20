@rem
@rem Gradle wrapper script for MyPal AI (Windows)
@rem
@rem This is a placeholder wrapper script. For a full build environment,
@rem generate the complete Gradle wrapper by running:
@rem   gradle wrapper --gradle-version 8.3
@rem
@rem Requires: Gradle 8.3, JDK 17+
@rem

@if "%DEBUG%"=="" @echo off
@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set APP_DIR=%~dp0
set GRADLE_WRAPPER_JAR=%APP_DIR%gradle\wrapper\gradle-wrapper.jar

@rem Check if the wrapper JAR exists
if not exist "%GRADLE_WRAPPER_JAR%" (
    echo.
    echo ============================================
    echo  MyPal AI - Gradle Wrapper
    echo ============================================
    echo.
    echo ERROR: Gradle wrapper JAR not found.
    echo.
    echo The gradle-wrapper.jar is not included in version control.
    echo To set up the Gradle wrapper, run one of the following:
    echo.
    echo   Option 1: Generate with local Gradle installation
    echo     cd %APP_DIR%
    echo     gradle wrapper --gradle-version 8.3
    echo.
    echo   Option 2: Use Android Studio
    echo     Open the android/ directory in Android Studio.
    echo     It will automatically download and configure Gradle.
    echo.
    echo Required versions:
    echo   - Gradle: 8.3
    echo   - JDK: 17+
    echo   - Android Gradle Plugin: 8.1.1
    echo.
    exit /b 1
)

@rem Execute Gradle wrapper
java %JAVA_OPTS% %GRADLE_OPTS% -classpath "%GRADLE_WRAPPER_JAR%" org.gradle.wrapper.GradleWrapperMain %*

if "%OS%"=="Windows_NT" endlocal

:end
