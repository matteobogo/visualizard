pipeline {
    agent {
      dockerfile {
        filename 'Dockerfile'
        dir '/visualizer/server'
        label 'visualizer-server'
        additionalBuildArgs  ''
      }
    }
    stages {
      stage('Build') {
        steps {
          sh 'npm install'
        }
      }
    }
}
